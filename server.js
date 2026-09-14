import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const filmes = [];
let proximoId = 1;

app.use(express.json());

function validarFilme(body) {
    const { titulo, genero, ano, diretor } = body;
    return Boolean(titulo && genero && ano && diretor);
}

function buscarFilme(id) {
    return filmes.find(filme => filme.id === Number(id));
}

app.post("/filmes", (req, res) => {
    if (!validarFilme(req.body)) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const { titulo, genero, ano, diretor } = req.body;
    const novoFilme = { id: proximoId++, titulo, genero, ano, diretor };
    filmes.push(novoFilme);
    res.status(201).json(novoFilme);
});

app.get("/filmes", (_req, res) => {
    res.json(filmes);
});

app.get("/filmes/:id", (req, res) => {
    const filme = buscarFilme(req.params.id);
    if (!filme) return res.status(404).json({ mensagem: "Filme não encontrado." });
    res.json(filme);
});

app.put("/filmes/:id", (req, res) => {
    const filme = buscarFilme(req.params.id);
    if (!filme) return res.status(404).json({ mensagem: "Filme não encontrado." });

    if (!validarFilme(req.body)) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const { titulo, genero, ano, diretor } = req.body;
    Object.assign(filme, { titulo, genero, ano, diretor });
    res.json(filme);
});

app.delete("/filmes/:id", (req, res) => {
    const indice = filmes.findIndex(filme => filme.id === Number(req.params.id));
    if (indice === -1) return res.status(404).json({ mensagem: "Filme não encontrado." });

    filmes.splice(indice, 1);
    res.json({ mensagem: "Filme excluído com sucesso." });
});

const arquivoExecutado = process.argv[1] ? path.resolve(process.argv[1]) : "";
const arquivoAtual = fileURLToPath(import.meta.url);

if (arquivoExecutado === arquivoAtual) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}

export default app;
