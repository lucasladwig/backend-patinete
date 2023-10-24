// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Geolib - Para calcular distâncias com base nas coordenadas
const geolib = require("geolib");

// Inicia o Servidor na porta 8081
let porta = 8081;
app.listen(porta, () => {
  console.log("Servidor em execução na porta: " + porta);
});

// Importa o package do SQLite
const sqlite3 = require("sqlite3");

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database("./dados-patinete.db", (err) => {
  if (err) {
    console.log("ERRO: não foi possível conectar ao SQLite.");
    throw err;
  }
  console.log("Conectado ao SQLite!");
});

// MÉTODOS CRUD HTTP
// Cria a tabela 'patinete', caso ela não exista
db.run(
  `CREATE TABLE IF NOT EXISTS patinete 
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

// POST /patinete - CADASTRAR um novo patinete
app.post("/patinete", (req, res, next) => {
  db.run(
    `INSERT INTO patinete(serial, status, lat, lng) VALUES(?, ?, ?, ?)`,
    [req.body.serial, req.body.status, req.body.lat, req.body.lng],
    (err) => {
      if (err) {
        console.log("Error: " + err);
        res.status(500).send("Erro ao cadastrar patinete.");
      } else {
        console.log("Patinete cadastrado com sucesso!");
        res.status(200).send("Patinete cadastrado com sucesso!");
      }
    }
  );
});

// GET /patinete - RETORNAR todos os patinetes
app.get("/patinete", (req, res, next) => {
  db.all(`SELECT * FROM patinete`, [], (err, result) => {
    if (err) {
      console.log("Erro: " + err);
      res.status(500).send("Erro ao obter dados de patinetes.");
    } else if (result.length === 0) {
      console.log("Lista de patinetes vazia!");
      res.status(500).send("Lista de patinetes vazia!");
    } else {
      res.status(200).json(result);
    }
  });
});

// GET /patinete/:serial - RETORNAR patinete com base no serial
app.get("/patinete/:serial", (req, res, next) => {
  db.get(
    `SELECT * FROM patinete WHERE serial = ?`,
    req.params.serial,
    (err, result) => {
      if (err) {
        console.log("Erro: " + err);
        res.status(500).send("Erro ao obter dados de patinetes.");
      } else if (result == null) {
        console.log("Patinete não encontrado.");
        res.status(404).send("Patinete não encontrado.");
      } else {
        res.status(200).json(result);
      }
    }
  );
});

// GET /patinete/:lat/:lng/:raio - RETORNAR todos patinetes disponíveis dentro do raio
app.get("/patinete/:lat/:lng/:raio", (req, res) => {
  const centro = {
    lat: parseFloat(req.params.lat),
    lng: parseFloat(req.params.lng),
  };
  const raio = parseInt(req.params.raio, 10);

  db.all("SELECT * FROM patinete", [], (err, result) => {
    if (err) {
      console.log("Erro: " + err);
      res.status(500).send("Erro ao obter dados de patinetes.");
    } else if (result.length === 0) {
      console.log("Nenhum patinete encontrado!");
      res.status(500).send("Nenhum patinete encontrado!");
    } else {
      let patinetes = result.filter((patinete) =>
        geolib.isPointWithinRadius(
          { lat: patinete.lat, lng: patinete.lng },
          centro,
          raio
        )
      );
      res.status(200).json(patinetes);
    }
  });
});

// PATCH /patinete/:serial - ALTERAR o cadastro de um patinete
app.patch("/patinete/:serial", (req, res, next) => {
  db.run(
    `UPDATE patinete 
        SET status = COALESCE(?, status), 
        lat = COALESCE(?, lat),
        lng = COALESCE(?, lng)
        WHERE serial = ?`,
    [req.body.status, req.body.lat, req.body.lng, req.params.serial],
    function (err) {
      if (err) {
        res.status(500).send("Erro ao alterar dados.");
      } else if (this.changes == 0) {
        console.log("Patinete não encontrado.");
        res.status(404).send("Patinete não encontrado.");
      } else {
        res.status(200).send("Patinete alterado com sucesso!");
      }
    }
  );
});

// DELETE /patinete/:serial - REMOVER um patinete do cadastro
app.delete("/patinete/:serial", (req, res, next) => {
  db.run(
    `DELETE FROM cadastro WHERE serial = ?`,
    req.params.serial,
    function (err) {
      if (err) {
        res.status(500).send("Erro ao remover patinete.");
      } else if (this.changes == 0) {
        console.log("Patinete não encontrado.");
        res.status(404).send("Patinete não encontrado.");
      } else {
        res.status(200).send("Patinete removido com sucesso!");
      }
    }
  );
});
