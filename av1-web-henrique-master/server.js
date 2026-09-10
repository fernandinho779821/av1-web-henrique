import express from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const pastaUploads = path.join(__dirname, "uploads");

fs.mkdirSync(pastaUploads, { recursive: true });
app.use(express.json());

const filmes = [];
let proximoId = 1;
const usuarios = [];
const tokensValidos = new Set();

function validarFilme(body) {
    const { titulo, genero, ano, diretor } = body;
    return Boolean(titulo && genero && ano && diretor);
}

function buscarFilme(id) {
    return filmes.find(filme => filme.id === Number(id));
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => callback(null, pastaUploads),
        filename: (_req, file, callback) => {
            const extensao = path.extname(file.originalname).toLowerCase();
            callback(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extensao}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const tiposPermitidos = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!tiposPermitidos.includes(file.mimetype)) {
            return callback(new Error("Apenas imagens JPEG, PNG, GIF ou WEBP são permitidas."));
        }
        callback(null, true);
    }
});

function autenticar(req, res, next) {
    const autorizacao = req.headers.authorization || "";
    const token = autorizacao.startsWith("Bearer ")
        ? autorizacao.slice(7)
        : req.headers["x-api-token"];

    if (!token || !tokensValidos.has(token)) {
        return res.status(401).json({ mensagem: "Token ausente ou inválido." });
    }

    next();
}

app.post("/usuarios", async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ mensagem: "Nome, email e senha são obrigatórios." });
    }

    if (usuarios.some(usuario => usuario.email === email)) {
        return res.status(409).json({ mensagem: "Este email já está cadastrado." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = { id: usuarios.length + 1, nome, email, senha: senhaHash };
    usuarios.push(usuario);
    res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
});

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    const usuario = usuarios.find(item => item.email === email);

    if (!usuario || !(await bcrypt.compare(senha || "", usuario.senha))) {
        return res.status(401).json({ mensagem: "Email ou senha inválidos." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    tokensValidos.add(token);
    res.json({ mensagem: "Login realizado com sucesso.", token });
});

app.post("/upload", autenticar, upload.single("imagem"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ mensagem: "Envie uma imagem no campo 'imagem'." });
    }

    res.status(201).json({
        mensagem: "Imagem enviada com sucesso.",
        arquivo: req.file.filename,
        caminho: `/uploads/${req.file.filename}`
    });
});

app.use("/uploads", express.static(pastaUploads));

app.post("/filmes", autenticar, (req, res) => {
    if (!validarFilme(req.body)) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const { titulo, genero, ano, diretor } = req.body;
    const novoFilme = { id: proximoId++, titulo, genero, ano, diretor };
    filmes.push(novoFilme);
    res.status(201).json(novoFilme);
});

app.get("/filmes", autenticar, (_req, res) => res.json(filmes));

app.get("/filmes/:id", autenticar, (req, res) => {
    const filme = buscarFilme(req.params.id);
    if (!filme) return res.status(404).json({ mensagem: "Filme não encontrado." });
    res.json(filme);
});

app.put("/filmes/:id", autenticar, (req, res) => {
    const filme = buscarFilme(req.params.id);
    if (!filme) return res.status(404).json({ mensagem: "Filme não encontrado." });

    if (!validarFilme(req.body)) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const { titulo, genero, ano, diretor } = req.body;
    Object.assign(filme, { titulo, genero, ano, diretor });
    res.json(filme);
});

app.delete("/filmes/:id", autenticar, (req, res) => {
    const indice = filmes.findIndex(filme => filme.id === Number(req.params.id));
    if (indice === -1) return res.status(404).json({ mensagem: "Filme não encontrado." });

    filmes.splice(indice, 1);
    res.json({ mensagem: "Filme excluído com sucesso." });
});

const swaggerDocument = {
    openapi: "3.0.0",
    info: {
        title: "API de Filmes - AV1 e AV2",
        version: "1.0.0",
        description: "CRUD em memória, autenticação, upload de imagens e documentação."
    },
    servers: [{ url: "http://localhost:3000" }],
    components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } }
    },
    paths: {
        "/usuarios": {
            post: {
                summary: "Cadastra um usuário",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", required: ["nome", "email", "senha"] } } }
                },
                responses: { 201: { description: "Usuário criado" } }
            }
        },
        "/login": { post: { summary: "Realiza login e retorna um token", responses: { 200: { description: "Login realizado" }, 401: { description: "Credenciais inválidas" } } } },
        "/filmes": {
            get: { summary: "Lista filmes", security: [{ bearerAuth: [] }], responses: { 200: { description: "Lista de filmes" } } },
            post: { summary: "Cadastra filme", security: [{ bearerAuth: [] }], responses: { 201: { description: "Filme criado" } } }
        },
        "/filmes/{id}": {
            get: { summary: "Consulta filme por ID", security: [{ bearerAuth: [] }], responses: { 200: { description: "Filme encontrado" }, 404: { description: "Não encontrado" } } },
            put: { summary: "Edita filme", security: [{ bearerAuth: [] }], responses: { 200: { description: "Filme atualizado" } } },
            delete: { summary: "Exclui filme", security: [{ bearerAuth: [] }], responses: { 200: { description: "Filme excluído" } } }
        },
        "/upload": { post: { summary: "Envia imagem", security: [{ bearerAuth: [] }], responses: { 201: { description: "Imagem enviada" } } } }
    }
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ mensagem: "A imagem deve ter no máximo 5 MB." });
    }
    if (error) return res.status(400).json({ mensagem: error.message });
    res.status(500).json({ mensagem: "Erro interno do servidor." });
});

const arquivoExecutado = process.argv[1]
    ? path.resolve(process.argv[1])
    : "";

if (arquivoExecutado === __filename) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}

export default app;
