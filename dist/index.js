// index.js
import express from "express";
import mongoose2 from "mongoose";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import session from "express-session";

// Posts.js
import mongoose from "mongoose";
var { Schema } = mongoose;
var postSchema = new Schema({
  titulo: { type: String, required: true },
  imagem: { type: String, required: true },
  categoria: { type: String },
  conteudo: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  autor: { type: String },
  views: { type: Number, default: 0 }
}, { collection: "posts" });
var Posts = mongoose.model("Posts", postSchema);
var Posts_default = Posts;

// index.js
import fileupload from "express-fileupload";
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var normalizeSlug = (title) => {
  return title.toLowerCase().trim().replace(/[^a-z0-9- ]/g, "").replace(/ +/g, "-").replace(/^-+|-+$/g, "");
};
mongoose2.set("strictQuery", false);
mongoose2.connect("mongodb+srv://cleberfdelgado:BZBndkd1suDUFKzf@cluster0.gd6c21a.mongodb.net/indicada?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Conectado com sucesso ao banco de dados indicada");
}).catch((err) => {
  console.error("Erro ao conectar ao MongoDB:", err.message);
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 6e4 }
}));
app.use(fileupload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, "public", "temp")
}));
app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.use("/public", express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "/pages"));
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "script-src 'self' 'nonce-2726c7f26c';");
  next();
});
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    if (typeof body === "string") {
      body = body.replace(/<chatgpt-sidebar[^>]*>.*?<\/chatgpt-sidebar>/g, "").replace(/<chatgpt-sidebar-popups[^>]*>.*?<\/chatgpt-sidebar-popups>/g, "");
    }
    return originalSend.call(this, body);
  };
  next();
});
app.get("/", async (req, res) => {
  try {
    const search = req.query.search;
    let posts;
    if (!search) {
      posts = await Posts_default.find({}).sort({ "_id": -1 }).exec();
    } else {
      posts = await Posts_default.find({ titulo: { $regex: search, $options: "i" } }).exec();
    }
    console.log("Posts encontrados:", posts);
    const postsTop = await Posts_default.find({}).sort({ views: -1 }).limit(5).exec();
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
    res.render("home", { posts: formattedPosts, postsTop: formattedPostsTop });
  } catch (err) {
    console.error("Erro ao processar a requisi\xE7\xE3o:", err.message);
    res.status(500).send("Erro ao processar a requisi\xE7\xE3o");
  }
});
app.get("/noticia/:slug", async (req, res) => {
  try {
    const slug = decodeURIComponent(req.params.slug);
    const post = await Posts_default.findOne({ slug }).exec();
    if (!post) {
      return res.status(404).send("Not\xEDcia n\xE3o encontrada");
    }
    const postsTop = await Posts_default.find({}).sort({ views: -1 }).limit(5).exec();
    res.render("single", {
      noticia: {
        titulo: post.titulo,
        conteudo: post.conteudo,
        imagem: post.imagem,
        categoria: post.categoria,
        autor: post.autor || "Desconhecido",
        visualizacoes: post.views
      },
      postsTop: postsTop.map((val) => ({
        titulo: val.titulo,
        descricaoCurta: val.conteudo.substring(0, 100),
        imagem: val.imagem,
        slug: encodeURIComponent(val.slug),
        visualizacoes: val.views
      }))
    });
    await Posts_default.updateOne({ slug }, { $inc: { views: 1 } });
  } catch (err) {
    console.error("Erro ao buscar a not\xEDcia:", err.message);
    res.status(500).send("Erro ao buscar a not\xEDcia.");
  }
});
app.post("/admin/cadastrar-noticia", async (req, res) => {
  try {
    const { titulo_noticia, noticia } = req.body;
    if (!titulo_noticia || !noticia) {
      return res.status(400).send("Todos os campos s\xE3o obrigat\xF3rios.");
    }
    let url_imagem = "";
    if (req.files && req.files.imagem) {
      let formato = req.files.imagem.name.split(".").pop();
      if (formato === "jpg") {
        const imagePath = path.join(__dirname, "public", "images", (/* @__PURE__ */ new Date()).getTime() + ".jpg");
        req.files.imagem.mv(imagePath);
        url_imagem = "/public/images/" + path.basename(imagePath);
      } else {
        fs.unlinkSync(req.files.imagem.tempFilePath);
      }
    }
    const novoPost = await Posts_default.create({
      titulo: titulo_noticia,
      conteudo: noticia,
      imagem: url_imagem,
      slug: normalizeSlug(titulo_noticia),
      categoria: "",
      autor: "Admin",
      views: 0
    });
    res.redirect("/");
  } catch (err) {
    console.error("Erro ao cadastrar not\xEDcia:", err.message);
    res.status(500).send("Erro ao cadastrar not\xEDcia.");
  }
});
app.get("/admin/deletar/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Posts_default.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).send(`Nenhuma not\xEDcia encontrada com o ID: ${id}`);
    }
    res.send(`Not\xEDcia com ID: ${id} deletada com sucesso!`);
  } catch (err) {
    console.error("Erro ao deletar not\xEDcia:", err.message);
    res.status(500).send("Erro ao deletar not\xEDcia.");
  }
});
app.get("/admin/login", (req, res) => {
  if (!req.session.login) {
    res.render("admin-login");
  } else {
    res.render("admin-panel");
  }
});
app.post("/admin/login", (req, res) => {
  const { login, senha } = req.body;
  if (login === "cleber" && senha === "123") {
    req.session.login = true;
    res.redirect("/admin/panel");
  } else {
    res.status(401).send("Credenciais inv\xE1lidas");
  }
});
app.get("/admin/panel", async (req, res) => {
  if (!req.session.login) {
    return res.redirect("/admin/login");
  }
  try {
    const posts = await Posts_default.find({}).sort({ _id: -1 }).exec();
    res.render("admin-panel", { posts });
  } catch (err) {
    console.error("Erro ao buscar not\xEDcias:", err.message);
    res.status(500).send("Erro ao carregar o painel do administrador.");
  }
});
app.get("/admin", (req, res) => {
  res.redirect("/admin/login");
});
app.listen(process.env.PORT ? Number(process.env.PORT) : 5e3, "0.0.0.0", () => {
  console.log("Servidor rodando na porta 5000!");
});
