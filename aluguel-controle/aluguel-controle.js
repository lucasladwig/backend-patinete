// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Axios - para enviar requisições HTTP para outros microsserviços
const axios = require("axios");

const urlCadastroUsuario = "localhost:8080";
const urlCadastroPatinete = "localhost:8081";
const urlControlePatinete = "localhost:8083";

// Inicia o Servidor na porta 8082
let porta = 8082;
app.listen(porta, () => {
  console.log("Servidor em execução na porta: " + porta);
});

// Importa o package do SQLite
const sqlite3 = require("sqlite3");
const { request } = require("http");

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database("./dados-aluguel.db", (err) => {
  if (err) {
    console.log("ERRO: não foi possível conectar ao SQLite.");
    throw err;
  }
  console.log("Conectado ao SQLite!");
});

// Cria a tabela 'aluguel', caso ela não exista
db.run(
  `CREATE TABLE IF NOT EXISTS aluguel 
  (id INTEGER PRIMARY KEY NOT NULL UNIQUE AUTO_INCREMENT, 
    patinete INTEGER,
    usuario INTEGER,
    inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    final TIMESTAMP,)`,
  [],
  (err) => {
    if (err) {
      console.log("ERRO: não foi possível criar tabela.");
      throw err;
    }
  }
);

// MÉTODOS CRUD HTTP
// POST /aluguel - CADASTRAR um novo aluguel
app.post("/aluguel", (req, res) => {
  if (
    entidadeExiste(`${urlCadastroPatinete}/patinete/${req.body.patinete}`) &&
    entidadeExiste(`${urlCadastroUsuario}/usuario/${req.body.usuario}`)
  ) {
    db.run(
      `INSERT INTO aluguel(patinete, usuario, inicio) VALUES(?, ?, ?)`,
      [req.body.patinete, req.body.usuario, req.body.inicio],
      (err) => {
        if (err) {
          console.log(err);
          res.status(500).send("Erro ao cadastrar aluguel.");
        } else {
          console.log("Aluguel cadastrado com sucesso!");
          res.status(200).send("Aluguel cadastrado com sucesso!");
        }
      }
    );
  } else {
    res.status(500).send("Usuário ou patinete não existem!");
  }
});

// GET /aluguel - RETORNAR todos os aluguéis
app.get("/aluguel", (req, res, next) => {
  db.all(`SELECT * FROM aluguel`, [], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao obter dados de aluguéis.");
    } else if (result.length === 0) {
      console.log("Lista de aluguéis vazia!");
      res.status(500).send("Lista de aluguéis vazia!");
    } else {
      res.status(200).json(result);
    }
  });
});

// GET /aluguel/:id - RETORNAR aluguel com base no id
app.get("/aluguel/:id", (req, res, next) => {
  db.get(`SELECT * FROM aluguel WHERE id = ?`, req.params.id, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao obter dados de aluguéis.");
    } else if (result == null) {
      console.log("Aluguel não encontrado.");
      res.status(404).send("Aluguel não encontrado.");
    } else {
      res.status(200).json(result);
    }
  });
});

// GET /aluguel/:usuario - RETORNAR todos aluguéis de um usuário
app.get("/aluguel/:usuario", (req, res) => {
  db.get(
    `SELECT * FROM aluguel WHERE usuario = ?`,
    req.params.usuario,
    (err, result) => {
      if (err) {
        console.log(err);
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

// GET /aluguel/:patinete - RETORNAR todos aluguéis de um patinete
app.get("/aluguel/:patinete", (req, res) => {
  db.get(
    `SELECT * FROM aluguel WHERE patinete = ?`,
    req.params.patinete,
    (err, result) => {
      if (err) {
        console.log(err);
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

// PATCH /aluguel/:id - ALTERAR o cadastro de um aluguel
app.patch("/aluguel/:id", (req, res, next) => {
  db.run(
    `UPDATE aluguel 
        SET patinete = COALESCE(?, patinete),
        usuario = COALESCE(?, usuario),
        inicio = COALESCE(?, inicio), 
        final = COALESCE(?, final),        
        WHERE id = ?`,
    [
      req.body.patinete,
      req.body.usuario,
      req.body.inicio,
      req.body.final,
      req.params.id,
    ],
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

// PATCH localhost:${portaCadastroPatinete}/patinete/:serial - ALTERAR status de patinete
axios.patch(`localhost:${portaCadastroPatinete}/patinete/:serial`, );

// DELETE /aluguel/:id - REMOVER um aluguel do cadastro
app.delete("/aluguel/:id", (req, res, next) => {
  db.run(`DELETE FROM cadastro WHERE id = ?`, req.params.id, function (err) {
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

// MÉTODOS AUXILIARES
// Verifica se a entidade existe
async function entidadeExiste(caminho) {
  try {
    const resposta = await axios.get(caminho);
    return resposta.status === 200;
  } catch (error) {
    console.error(error);
  }
}

// Modifica cadastro de entidade
async function modificaEntidade(caminho) {
  try {
    const resposta = await axios.get(caminho);
    if (resposta.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
  }
}
