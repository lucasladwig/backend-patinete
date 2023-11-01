// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Geolib - Para calcular distâncias com base nas coordenadas
const geolib = require("geolib");

// Inicia o Servidor
let porta = 8081;
app.listen(porta, () => {
  console.log("Servidor em execução na porta: " + porta);
});

// Importa o package do SQLite
const sqlite3 = require("sqlite3");

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database("./dados-patinete.db", (err) => {
  if (err) {
    console.log("Erro ao tentar conectar ao SQLite!");
    throw err;
  }
  console.log("Conectado ao banco de dados de patinetes!");
});

// Cria a tabela 'patinete', caso ela não exista
db.run(
  `CREATE TABLE IF NOT EXISTS patinete 
  (serial INTEGER PRIMARY KEY NOT NULL UNIQUE,
    disponibilidade TEXT CHECK(disponibilidade IN ('disponível', 'em uso', 'fora de serviço')) NOT NULL,
    lat REAL, 
    lng REAL)`,
  [],
  (err) => {
    if (err) {
      console.error("Erro ao tentar criar tabela de patinetes!");
      throw err;
    }
  }
);

// MÉTODOS CRUD HTTP
// POST /patinete - CADASTRAR um novo patinete
app.post("/patinete", (req, res) => {
  db.run(
    `INSERT INTO patinete(serial, disponibilidade, lat, lng) VALUES(?, ?, ?, ?)`,
    [req.body.serial, req.body.disponibilidade, req.body.lat, req.body.lng],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Erro ao cadastrar patinete!");
      } else {
        console.log(
          `Patinete serial ${req.params.serial} cadastrado com sucesso!`
        );
        res
          .status(200)
          .send(`Patinete serial ${req.params.serial} cadastrado com sucesso!`);
      }
    }
  );
});

// GET /patinete - RETORNAR todos os patinetes
app.get("/patinete", (req, res) => {
  db.all(`SELECT * FROM patinete`, [], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao acessar lista de patinetes!");
    } else if (result.length === 0) {
      console.log("Lista de patinetes vazia!");
      res.status(500).send("Lista de patinetes vazia!");
    } else {
      console.log("Lista de patinetes encontrada!");
      res.status(200).json(result);
    }
  });
});

// GET /patinete/:serial - RETORNAR patinete com base no serial
app.get("/patinete/:serial", (req, res) => {
  db.get(
    `SELECT * FROM patinete WHERE serial = ?`,
    req.params.serial,
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send("Erro ao acessar lista de patinetes!");
      } else if (result == null) {
        console.log(`Patinete serial ${req.params.serial} não encontrado!`);
        res
          .status(404)
          .send(`Patinete serial ${req.params.serial} não encontrado!`);
      } else {
        console.log(`Patinete serial ${req.params.serial} encontrado!`);
        res.status(200).json(result);
      }
    }
  );
});

// GET /patinete/:lat/:lng/:raio - RETORNAR todos patinetes disponíveis dentro do raio
app.get("/patinete/:lat/:lng/:raio", async (req, res) => {
  try {
    // Determina coordenadas de centro e raio de distância
    const centro = {
      lat: req.params.lat,
      lng: req.params.lng,
    };
    const raio = req.params.raio; // Raio em metros

    // Retorna patinetes disponíveis
    const patinetes = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM patinete WHERE disponibilidade = 'disponível'",
        [],
        (err, result) => {
          if (err) {
            console.error(err);
            res.status(500).send("Erro ao acessar lista de patinetes!");
            reject(err);
          } else if (result.length === 0) {
            console.log("Nenhum patinete disponível encontrado!");
            res.status(500).send("Nenhum patinete disponível encontrado!");
          } else {
            resolve(result);
          }
        }
      );
    });
    // Filtra patinetes estão dentro do raio
    const patinetesProximos = patinetes.filter((patinete) =>
      geolib.isPointWithinRadius(
        { lat: patinete.lat, lng: patinete.lng },
        centro,
        raio
      )
    );
    if (patinetesProximos.length === 0) {
      res.status(404).send("Nenhum patinete próximo encontrado!");
    } else {
      console.log("Lista de patinetes próximos encontrada!");
      res.status(200).json(patinetesProximos);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao obter lista de patinetes!");
  }
});

// PATCH /patinete/:serial - ALTERAR o cadastro de um patinete
app.patch("/patinete/:serial", (req, res) => {
  db.run(
    `UPDATE patinete 
        SET disponibilidade = COALESCE(?, disponibilidade), 
        lat = COALESCE(?, lat),
        lng = COALESCE(?, lng)
        WHERE serial = ?`,
    [req.body.disponibilidade, req.body.lat, req.body.lng, req.params.serial],
    function (err) {
      if (err) {
        console.error(err);
        res
          .status(500)
          .send(
            `Erro ao alterar dados do patinete serial ${req.params.serial}!`
          );
      } else if (this.changes == 0) {
        console.log(`Patinete serial ${req.params.serial} não encontrado!`);
        res
          .status(404)
          .send(`Patinete serial ${req.params.serial} não encontrado!`);
      } else {
        console.log(
          `Patinete serial ${req.params.serial} alterado com sucesso!`
        );
        res
          .status(200)
          .send(`Patinete serial ${req.params.serial} alterado com sucesso!`);
      }
    }
  );
});

// DELETE /patinete/:serial - REMOVER um patinete do cadastro
app.delete("/patinete/:serial", (req, res) => {
  db.run(
    `DELETE FROM patinete WHERE serial = ?`,
    req.params.serial,
    function (err) {
      if (err) {
        console.error(err);
        res
          .status(500)
          .send(`Erro ao remover patinete serial ${req.params.serial}!`);
      } else if (this.changes == 0) {
        console.log(`Patinete serial ${req.params.serial} não encontrado!`);
        res
          .status(404)
          .send(`Patinete serial ${req.params.serial} não encontrado!`);
      } else {
        console.log(
          `Patinete serial ${req.params.serial} removido com sucesso!`
        );
        res
          .status(200)
          .send(`Patinete serial ${req.params.serial} removido com sucesso!`);
      }
    }
  );
});
