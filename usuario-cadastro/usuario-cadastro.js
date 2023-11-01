// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicia o Servidor
let porta = 8080;
app.listen(porta, () => {
  console.log("Servidor em execução na porta: " + porta);
});

// Importa o package do SQLite
const sqlite3 = require("sqlite3");

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database("./dados-usuario.db", (err) => {
  if (err) {
    console.log("ERRO: não foi possível conectar ao SQLite.");
    throw err;
  }
  console.log("Conectado ao banco de dados de usuários!");
});

// Cria a tabela 'usuario', caso ela não exista
db.run(
  `CREATE TABLE IF NOT EXISTS usuario 
        (cpf INTEGER PRIMARY KEY NOT NULL UNIQUE,
            nome TEXT NOT NULL,
            email TEXT NOT NULL, 
            telefone INTEGER NOT NULL)`,
  [],
  (err) => {
    if (err) {
      console.log("ERRO: não foi possível criar tabela.");
      throw err;
    }
  }
);

// MÉTODOS CRUD HTTP
// POST /usuario - CADASTRAR um novo usuário
app.post("/usuario", (req, res) => {
  db.run(
    `INSERT INTO usuario(cpf, nome, email, telefone) VALUES(?, ?, ?, ?)`,
    [req.body.cpf, req.body.nome, req.body.email, req.body.telefone],
    (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao cadastrar usuário.");
      } else {
        console.log("Usuário cadastrado com sucesso!");
        res.status(200).send("Usuário cadastrado com sucesso!");
      }
    }
  );
});

// GET /usuario - RETORNAR todos os usuários
app.get("/usuario", (req, res) => {
  db.all(`SELECT * FROM usuario`, [], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao obter dados de usuários.");
    } else if (result.length === 0) {
        console.log("Lista de usuários vazia!");
        res.status(500).send("Lista de usuários vazia!");
    } else {
      res.status(200).json(result);
    }
  });
});

// GET /usuario/:cpf - RETORNAR usuário com base no CPF
app.get("/usuario/:cpf", (req, res) => {
  db.get(
    `SELECT * FROM usuario WHERE cpf = ?`,
    req.params.cpf,
    (err, result) => {
      if (err) {
        console.log("Erro: " + err);
        res.status(500).send("Erro ao obter dados do usuário.");
      } else if (result == null) {
        console.log("Usuário não encontrado.");
        res.status(404).send("Usuário não encontrado.");
      } else {
        res.status(200).json(result);
      }
    }
  );
});

// PATCH /usuario/:cpf - ALTERAR o cadastro de um usuário
app.patch("/usuario/:cpf", (req, res) => {
  db.run(
    `UPDATE usuario 
        SET nome = COALESCE(?, nome), 
        email = COALESCE(?, email),
        telefone = COALESCE(?, telefone)
        WHERE cpf = ?`,
    [req.body.nome, req.body.email, req.body.telefone, req.params.cpf],
    function (err) {
      if (err) {
        res.status(500).send("Erro ao alterar dados de usuário.");
      } else if (this.changes == 0) {
        console.log("Usuário não encontrado.");
        res.status(404).send("Usuário não encontrado.");
      } else {
        res.status(200).send("Usuário alterado com sucesso!");
      }
    }
  );
});

// DELETE /usuario/:cpf - REMOVER um usuário do cadastro
app.delete("/usuario/:cpf", (req, res) => {
  db.run(`DELETE FROM cadastro WHERE cpf = ?`, req.params.cpf, function (err) {
    if (err) {
      res.status(500).send("Erro ao remover usuário.");
    } else if (this.changes == 0) {
      console.log("Usuário não encontrado.");
      res.status(404).send("Usuário não encontrado.");
    } else {
      res.status(200).send("Usuário removido com sucesso!");
    }
  });
});
