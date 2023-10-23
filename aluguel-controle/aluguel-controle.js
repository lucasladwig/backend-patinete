// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicia o Servidor na porta 8080
let porta = 8080;
app.listen(porta, () => {
  console.log("Servidor em execução na porta: " + porta);
});

// Importa o package do SQLite
const sqlite3 = require("sqlite3");

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database("./dados-aluguel.db", (err) => {
  if (err) {
    console.log("ERRO: não foi possível conectar ao SQLite.");
    throw err;
  }
  console.log("Conectado ao SQLite!");
});

// MÉTODOS CRUD HTTP
// Cria a tabela 'aluguel', caso ela não exista
db.run(
  `CREATE TABLE IF NOT EXISTS aluguel 
        (serial INTEGER PRIMARY KEY NOT NULL UNIQUE,
            status TEXT CHECK(status IN ("disponível", "em uso", "fora de serviço")) NOT NULL,
            lat REAL, 
            lng REAL)`,
  [],
  (err) => {
    if (err) {
      console.log("ERRO: não foi possível criar tabela.");
      throw err;
    }
  }
);

// POST /aluguel - CADASTRAR um novo aluguel
app.post("/aluguel", (req, res, next) => {
  db.run(
    `INSERT INTO aluguel(serial, status, lat, lng) VALUES(?, ?, ?, ?)`,
    [req.body.serial, req.body.status, req.body.lat, req.body.lng],
    (err) => {
      if (err) {
        console.log("Error: " + err);
        res.status(500).send("Erro ao cadastrar aluguel.");
      } else {
        console.log("Aluguel cadastrado com sucesso!");
        res.status(200).send("Aluguel cadastrado com sucesso!");
      }
    }
  );
});

// GET /aluguel - RETORNAR todos os aluguéis
app.get("/aluguel", (req, res, next) => {
  db.all(`SELECT * FROM aluguel`, [], (err, result) => {
    if (err) {
      console.log("Erro: " + err);
      res.status(500).send("Erro ao obter dados de aluguéis.");
    } else if (result.length === 0) {
        console.log("Lista de aluguéis vazia!");
        res.status(500).send("Lista de aluguéis vazia!");

    } else {
      res.status(200).json(result);
    }
  });
});

// GET /aluguel/:serial - RETORNAR aluguel com base no serial
app.get("/aluguel/:serial", (req, res, next) => {
  db.get(
    `SELECT * FROM aluguel WHERE serial = ?`,
    req.params.serial,
    (err, result) => {
      if (err) {
        console.log("Erro: " + err);
        res.status(500).send("Erro ao obter dados de aluguéis.");
      } else if (result == null) {
        console.log("Aluguel não encontrado.");
        res.status(404).send("Aluguel não encontrado.");
      } else {
        res.status(200).json(result);
      }
    }
  );
});

// PATCH /aluguel/:serial - ALTERAR o cadastro de um aluguel
app.patch("/aluguel/:serial", (req, res, next) => {
  db.run(
    `UPDATE aluguel 
        SET status = COALESCE(?, status), 
        lat = COALESCE(?, lat),
        lng = COALESCE(?, lng)
        WHERE serial = ?`,
    [req.body.status, req.body.lat, req.body.lng, req.params.serial],
    function (err) {
      if (err) {
        res.status(500).send("Erro ao alterar dados.");
      } else if (this.changes == 0) {
        console.log("Aluguel não encontrado.");
        res.status(404).send("Aluguel não encontrado.");
      } else {
        res.status(200).send("Aluguel alterado com sucesso!");
      }
    }
  );
});

// DELETE /aluguel/:serial - REMOVER um aluguel do cadastro
app.delete("/aluguel/:serial", (req, res, next) => {
  db.run(`DELETE FROM cadastro WHERE serial = ?`, req.params.serial, function (err) {
    if (err) {
      res.status(500).send("Erro ao remover aluguel.");
    } else if (this.changes == 0) {
      console.log("Aluguel não encontrado.");
      res.status(404).send("Aluguel não encontrado.");
    } else {
      res.status(200).send("Aluguel removido com sucesso!");
    }
  });
});
