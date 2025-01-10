import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import session from 'express-session';
import Posts from './Posts.js';
import fileupload from 'express-fileupload';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Função para normalizar slugs
const normalizeSlug = (title) => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9- ]/g, '') // Remove caracteres especiais
        .replace(/ +/g, '-')         // Substitui espaços por hifens
        .replace(/^-+|-+$/g, '');    // Remove hifens no início ou final
};

// Conectar ao MongoDB
mongoose.set('strictQuery', false);
mongoose.connect('mongodb+srv://cleberfdelgado:BZBndkd1suDUFKzf@cluster0.gd6c21a.mongodb.net/indicada?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Conectado com sucesso ao banco de dados indicada');
}).catch((err) => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
});

// Configurações de middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));
app.use(fileupload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'public', 'temp')
}));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.use('./public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/pages'));

// Middleware para Content Security Policy (CSP)
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "script-src 'self' 'nonce-2726c7f26c';");
    next();
});

// Middleware para remover tags indesejadas
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        if (typeof body === 'string') {
            body = body.replace(/<chatgpt-sidebar[^>]*>.*?<\/chatgpt-sidebar>/g, '')
                       .replace(/<chatgpt-sidebar-popups[^>]*>.*?<\/chatgpt-sidebar-popups>/g, '');
        }
        return originalSend.call(this, body);
    };
    next();
});

// Rota principal
app.get('/', async (req, res) => {
    try {
        const search = req.query.search;
        let posts;

        if (!search) {
            posts = await Posts.find({}).sort({ '_id': -1 }).exec();
        } else {
            posts = await Posts.find({ titulo: { $regex: search, $options: "i" } }).exec();
        }

        console.log("Posts encontrados:", posts);

        const postsTop = await Posts.find({}) // Notícias mais populares por visualizações
            .sort({ views: -1 })
            .limit(5)
            .exec();

        const formattedPosts = posts.map((val) => ({
            titulo: val.titulo,
            conteudo: val.conteudo,
            descricaoCurta: val.conteudo.substring(0, 100),
            imagem: val.imagem,
            slug: encodeURIComponent(val.slug),
            categoria: val.categoria,
            visualizacoes: val.views
        }));

        const formattedPostsTop = postsTop.map((val) => ({
            titulo: val.titulo,
            conteudo: val.conteudo,
            descricaoCurta: val.conteudo.substring(0, 100),
            imagem: val.imagem,
            slug: encodeURIComponent(val.slug),
            categoria: val.categoria,
            visualizacoes: val.views
        }));

        res.render('home', { posts: formattedPosts, postsTop: formattedPostsTop });
    } catch (err) {
        console.error('Erro ao processar a requisição:', err.message);
        res.status(500).send('Erro ao processar a requisição');
    }
});

// Rota para cadastrar notícia
app.post('/admin/cadastrar-noticia', async (req, res) => {
    try {
        const { titulo_noticia, noticia, imagem_url } = req.body;

        // Verificação dos dados obrigatórios
        if (!titulo_noticia || !noticia) {
            return res.status(400).send("Todos os campos são obrigatórios.");
        }

        let url_imagem = '';

        // Se a imagem for um arquivo
        if (req.files && req.files.imagem) {
            let formato = req.files.imagem.name.split('.').pop();
            console.log('Formato da imagem:', formato); // Adicione um log para depurar

            if (['jpg', 'jpeg', 'png'].includes(formato)) {
                const imagePath = path.join(__dirname, 'public', 'images', new Date().getTime() + '.' + formato);
                req.files.imagem.mv(imagePath, (err) => {
                    if (err) {
                        console.error('Erro ao mover a imagem:', err.message);
                    }
                });
                url_imagem = '/images/' + path.basename(imagePath); // Caminho da imagem
            } else {
                fs.unlinkSync(req.files.imagem.tempFilePath); // Deleta o arquivo se for formato inválido
                return res.status(400).send("Formato de imagem inválido. Apenas JPG, JPEG ou PNG são permitidos.");
            }
        } else if (imagem_url) {
            // Se a imagem for uma URL
            url_imagem = imagem_url;
        }

        // Verificar se o slug já existe no banco de dados
        const slugExistente = await Posts.findOne({ slug: normalizeSlug(titulo_noticia) });
        if (slugExistente) {
            return res.status(400).send("Já existe uma notícia com esse slug.");
        }

        const novoPost = await Posts.create({
            titulo: titulo_noticia,
            conteudo: noticia,
            imagem: url_imagem,  // Caminho da imagem
            slug: normalizeSlug(titulo_noticia),
            categoria: "",
            autor: "Admin",
            views: 0
        });

        console.log("Novo post criado:", novoPost);

        res.redirect('/');
    } catch (err) {
        console.error("Erro ao cadastrar notícia:", err.message);
        res.status(500).send("Erro ao cadastrar notícia.");
    }
});

// Outras rotas...

// Iniciar servidor
app.listen(process.env.PORT ? Number(process.env.PORT) : 5000, '0.0.0.0', () => {
    console.log('Servidor rodando na porta 5000!');
});
