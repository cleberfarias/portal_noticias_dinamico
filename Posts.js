import mongoose from 'mongoose';

const { Schema } = mongoose;

const postSchema = new Schema({
    titulo: { type: String,},
    imagem: { type: String,  },
    categoria: { type: String },
    conteudo: { type: String,  },
    slug: { type: String, required: true, unique: true },
    autor: { type: String },
    views: { type: Number, default: 0 }
}, { collection: 'posts' });

const Posts = mongoose.model('Posts', postSchema);

export default Posts;
