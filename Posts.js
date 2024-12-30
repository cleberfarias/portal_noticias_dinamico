import mongoose from 'mongoose';

const { Schema } = mongoose;

const postSchema = new Schema({
    titulo: { type: String, required: true },
    imagem: { type: String, required: true },
    categoria: { type: String },
    conteudo: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    autor: { type: String },
    views: { type: Number, default: 0 }
}, { collection: 'posts' });

const Posts = mongoose.model('Posts', postSchema);

export default Posts;
