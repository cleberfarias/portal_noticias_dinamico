var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var postSchema = new Schema({
    titulo: { type: String, required: true },
    imagem: { type: String, required: true },
    categoria: { type: String },
    conteudo: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    autor: { type: String },
    views: { type: Number, default: 0 }
}, { collection: 'posts' });

var Posts = mongoose.model("Posts", postSchema);

module.exports = Posts;
export default Posts;
