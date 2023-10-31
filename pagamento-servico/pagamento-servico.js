// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicia o Servidor na porta 8084
let porta = 8084;
app.listen(porta, () => {
  console.log("Servidor de pagamentos em execução na porta: " + porta);
});

// Importa o package do SQLite
const sqlite3 = require("sqlite3");

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database("./dados-pagamento.db", (err) => {
  if (err) {
    console.log("ERRO: não foi possível conectar ao SQLite.");
    throw err;
  }
  console.log("Conectado ao SQLite!");
});

// Cria a tabela 'pagamento', caso ela não exista
db.run(
  `CREATE TABLE IF NOT EXISTS pagamento 
  (id INTEGER PRIMARY KEY NOT NULL UNIQUE AUTO_INCREMENT, 
    usuario INTEGER NOT NULL,
    valor INTEGER NOT NULL,
    cartao INTEGER NOT NULL,)`,
  [],
  (err) => {
    if (err) {
      console.log("ERRO: não foi possível criar tabela.");
      throw err;
    }
  }
);

// MÉTODOS CRUD HTTP
// POST /pagamento - CADASTRAR um novo pagamento
app.post("/pagamento", (req, res) => {
  db.run(
    `INSERT INTO pagamento(usuario, valor, cartao) VALUES(?, ?, ?)`, // id é autoincrement - TESTAR
    [req.body.usuario, req.body.valor, req.body.cartao],
    (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao cadastrar pagamento.");
      } else {
        console.log("Pagamento cadastrado com sucesso!");
        res.status(200).send("Pagamento cadastrado com sucesso!");
      }
    }
  );
});

// GET /pagamento - RETORNAR todos os pagamentos
app.get("/pagamento", (req, res, next) => {
  db.all(`SELECT * FROM pagamento`, [], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao obter dados de pagamentos.");
    } else if (result.length === 0) {
      console.log("Lista de pagamentos vazia!");
      res.status(500).send("Lista de pagamentos vazia!");
    } else {
      res.status(200).json(result);
    }
  });
});

// GET /pagamento/:id - RETORNAR pagamento com base no id
app.get("/pagamento/:id", (req, res, next) => {
  db.get(
    `SELECT * FROM pagamento WHERE id = ?`,
    req.params.id,
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao obter dados de pagamentos.");
      } else if (result == null) {
        console.log("Pagamento não encontrado.");
        res.status(404).send("Pagamento não encontrado.");
      } else {
        res.status(200).json(result);
      }
    }
  );
});

// GET /pagamento/:usuario - RETORNAR todos pagamentos de um usuário
app.get("/pagamento/:usuario", (req, res) => {
  db.get(
    `SELECT * FROM pagamento WHERE usuario = ?`,
    req.params.usuario,
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao obter dados de pagamentos.");
      } else if (result == null) {
        console.log("Pagamento não encontrado.");
        res.status(404).send("Pagamento não encontrado.");
      } else {
        res.status(200).json(result);
      }
    }
  );
});

// PATCH /pagamento/:id - ALTERAR dados de um pagamento
app.patch("/pagamento/:id", (req, res) => {
  db.run(
    `UPDATE pagamento 
        SET usuario = COALESCE(?, usuario),
        valor = COALESCE(?, valor), 
        cartao = COALESCE(?, cartao)
        WHERE id = ?`,
    [req.body.usuario, req.body.valor, req.body.cartao, req.params.id],
    function (err) {
      if (err) {
        res.status(500).send("Erro ao alterar dados.");
      } else if (this.changes == 0) {
        console.log("Pagamento não encontrado.");
        res.status(404).send("Pagamento não encontrado.");
      } else {
        res.status(200).send("Pagamento alterado com sucesso!");
      }
    }
  );
});

// DELETE /pagamento/:id - REMOVER um pagamento do cadastro
app.delete("/pagamento/:id", (req, res, next) => {
  db.run(`DELETE FROM pagamento WHERE id = ?`, req.params.id, function (err) {
    if (err) {
      res.status(500).send("Erro ao remover pagamento.");
    } else if (this.changes == 0) {
      console.log("Pagamento não encontrado.");
      res.status(404).send("Pagamento não encontrado.");
    } else {
      res.status(200).send("Pagamento removido com sucesso!");
    }
  });
});
