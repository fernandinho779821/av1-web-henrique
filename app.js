const express = require("express");

const app = express();

app.use(express.json());

let filmes = [];
let proximoId = 1;

app.post("/filmes", (req, res) => {
    const { titulo, genero, ano, diretor } = req.body;

    if (!titulo || !genero || !ano || !diretor) {
        return res.status(400).json({
            mensagem: "Todos os campos são obrigatórios."
        });
    }

    const novoFilme = {
        id: proximoId++,
        titulo,
        genero,
        ano,
        diretor
    };

    filmes.push(novoFilme);

    res.status(201).json(novoFilme);
});

app.get("/filmes", (req, res) => {
    res.json(filmes);
});

app.get("/filmes/:id", (req, res) => {
    const id = Number(req.params.id);

    const filme = filmes.find(f => f.id === id);

    if (!filme) {
        return res.status(404).json({
            mensagem: "Filme não encontrado."
        });
    }

    res.json(filme);
});

app.put("/filmes/:id", (req, res) => {
    const id = Number(req.params.id);

    const filme = filmes.find(f => f.id === id);

    if (!filme) {
        return res.status(404).json({
            mensagem: "Filme não encontrado."
        });
    }

    const { titulo, genero, ano, diretor } = req.body;

    if (!titulo || !genero || !ano || !diretor) {
        return res.status(400).json({
            mensagem: "Todos os campos são obrigatórios."
        });
    }

    filme.titulo = titulo;
    filme.genero = genero;
    filme.ano = ano;
    filme.diretor = diretor;

    res.json(filme);
});

app.delete("/filmes/:id", (req, res) => {
    const id = Number(req.params.id);

    const indice = filmes.findIndex(f => f.id === id);

    if (indice === -1) {
        return res.status(404).json({
            mensagem: "Filme não encontrado."
        });
    }

    filmes.splice(indice, 1);

    res.json({
        mensagem: "Filme excluído com sucesso."
    });
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});