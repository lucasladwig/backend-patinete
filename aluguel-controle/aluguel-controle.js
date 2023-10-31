// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Axios - para enviar requisições HTTP para outros microsserviços
const axios = require("axios");

const urlCadastroUsuario = "localhost:8080/usuario";
const urlCadastroPatinete = "localhost:8081/patinete";
const urlControlePatinete = "localhost:8083/controle";
const urlServicoPagamento = "localhost:8084/pagamento";

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
  `CREATE TABLE IF NOT EXISTS aluguel (
    id INTEGER PRIMARY KEY NOT NULL UNIQUE, 
    patinete INTEGER NOT NULL,
    usuario INTEGER NOT NULL,
    inicio TEXT DEFAULT CURRENT_TIMESTAMP,
    final TEXT,
    custo REAL
  )}`,
  [],
  (err) => {
    if (err) {
      console.log("ERRO: não foi possível criar tabela.");
      throw err;
    }
  }
);

// MÉTODOS CRUD HTTP
// POST /aluguel - INICIAR um novo aluguel
app.post("/aluguel", (req, res) => {
  // Verifica se usuario e patinete existem no banco de dados
  if (
    entidadeExiste(`${urlCadastroPatinete}/${req.body.patinete}`) &&
    entidadeExiste(`${urlCadastroUsuario}/${req.body.usuario}`)
  ) {
    // Verifica se o patinete está disponível
    if (
      verificaDisponibilidade(`${urlCadastroPatinete}/${req.body.patinete}`)
    ) {
      // Insere novo aluguel no banco de dados
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
      // Atualiza disponibilidade e desbloqueia patinete (bancos de dados externo)
      alterarDadosExternos(`${urlCadastroPatinete}/${req.body.patinete}`, {
        disponibilidade: "em uso",
      });
      alterarDadosExternos(`${urlControlePatinete}/${req.body.patinete}`, {
        disponibilidade: "em uso",
      });
    } else {
      res.status(500).send("Patinete indisponível!");
    }
  } else {
    res.status(500).send("Usuário ou patinete não existem!");
  }
});

// GET /aluguel - RETORNAR todos os aluguéis
app.get("/aluguel", (req, res) => {
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
app.get("/aluguel/:id", (req, res) => {
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

// PATCH /aluguel/:id - FINALIZAR um aluguel - Altera apenas data/hora de final
app.patch("/aluguel/:id", (req, res) => {
  db.run(
    `UPDATE aluguel 
        SET final = COALESCE(?, final)
        WHERE id = ?`,
    [req.body.final, req.params.id],
    function (err) {
      if (err) {
        res.status(500).send("Erro ao alterar dados.");
      } else if (this.changes == 0) {
        console.log("Aluguel não encontrado.");
        res.status(404).send("Aluguel não encontrado.");
      } else {
        res.status(200).send("Aluguel finalizado com sucesso!");
      }
    }
  );
  // Atualiza disponibilidade e bloqueia patinete (bancos de dados externo)
  alterarDadosExternos(`${urlCadastroPatinete}/${req.body.patinete}`, {
    disponibilidade: "disponível",
  });
  alterarDadosExternos(`${urlControlePatinete}/${req.body.patinete}`, {
    disponibilidade: "disponível",
  });
  // Calcula
});

// PATCH /aluguel/disponibilidade/:serial - ALTERAR status de patinete (comunica com outro microsserviço)
app.patch("/aluguel/disponibilidade/:serial", async (req, res) => {
  try {
    // Pega parametros e body da requisição e envia para microsserviço via axios
    const dados = req.body.disponibilidade;
    const url = `${urlCadastroPatinete}/:serial`;
    const resposta = await axios.patch(
      url.replace(":serial", req.params.serial),
      { data: dados }
    );
    res.status(200).send(resposta.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao obter dados de patinete.");
  }
});

// DELETE /aluguel/:id - REMOVER um aluguel do cadastro
app.delete("/aluguel/:id", (req, res) => {
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

// MÉTODOS DE COMUNICAÇÃO EXTERNA AO SERVIÇO (AXIOS)
// Verifica se patinete está disponível
async function verificaDisponibilidade(url) {
  try {
    const resposta = await axios.get(url);
    if (resposta.data.disponibilidade === "disponível") {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error(err);
  }
}

// Alterar dados
async function alterarDadosExternos(url, dados) {
  try {
    // Pega parametros e body da requisição e envia para microsserviço via axios
    const resposta = await axios.patch(url, {
      data: dados,
    });
    res.status(200).send(resposta.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao obter dados de patinete.");
  }
}

// Verifica se a entidade existe
async function entidadeExiste(url) {
  try {
    const resposta = await axios.get(url);
    return resposta.status === 200;
  } catch (err) {
    console.error(err);
  }
}

// MÉTODOS AUXILIARES
// Calcula valor do aluguel
function calculaValorAluguel(inicio, final) {
  // Converte tempos em objetos Date e calcula os minutos do aluguel
  const tempoInicio = new Date(inicio);
  const tempoFinal = new Date(final);
  const minutosTotal = tempoFinal.getTime() - tempoInicio.getTime() / 60000;

  // Cálculo do valor total (Regra de negócio)
  const taxaFixa = 5.0;
  const taxaMinuto = 0.15;
  return taxaFixa + taxaMinuto * minutosTotal;
}
