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

// Inicia o Servidor
let porta = 8082;
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
  console.log("Conectado ao banco de dados de aluguéis!");
});

// Cria a tabela 'aluguel', caso ela não exista
db.run(
  `CREATE TABLE IF NOT EXISTS aluguel (
    id INTEGER PRIMARY KEY NOT NULL UNIQUE, 
    patinete INTEGER NOT NULL,
    usuario INTEGER NOT NULL,
    inicio TEXT DEFAULT CURRENT_TIMESTAMP,
    final TEXT,
    valor REAL,
    cartao INTEGER NOT NULL
  )`,
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
app.post("/aluguel", async (req, res) => {
  try {
    // Busca usuário e patinete nos bancos de dados
    const [patineteAlvo, usuarioAlvo] = await Promise.all([
      axios.get(`${urlCadastroPatinete}/${req.body.patinete}`),
      axios.get(`${urlCadastroUsuario}/${req.body.usuario}`),
    ]);
    // Verifica se patinete e usuário existem
    if (patineteAlvo.data && usuarioAlvo.data) {
      // Verifica se patinetes está disponível
      if (patineteAlvo.data.disponibilidade === "disponível") {
        db.run(
          `INSERT INTO aluguel(patinete, usuario, cartao) VALUES(?, ?, ?)`,
          [req.body.patinete, req.body.usuario, req.body.cartao]
        );

        // Libera patinete e atualiza sua disponibilidade
        await Promise.all([
          alterarDadosExternos(`${urlControlePatinete}/${req.body.patinete}`, {
            acesso: "liberar",
          }),
          alterarDadosExternos(`${urlCadastroPatinete}/${req.body.patinete}`, {
            disponibilidade: "em uso",
          }),
        ]);
        console.log("Aluguel cadastrado com sucesso!");
        res.status(200).send("Aluguel cadastrado com sucesso!");
      } else {
        res.status(500).send("Patinete indisponível!");
      }
    } else {
      res.status(500).send("Usuário ou patinete não existem!");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao cadastrar aluguel.");
  }
});

// GET /aluguel - RETORNAR todos os aluguéis
app.get("/aluguel", (req, res) => {
  db.all(`SELECT * FROM aluguel`, [], (err, result) => {
    if (err) {
      console.error(err);
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
      console.error(err);
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
  db.all(
    `SELECT * FROM aluguel WHERE usuario = ?`,
    req.params.usuario,
    (err, result) => {
      if (err) {
        console.error(err);
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
  db.all(
    `SELECT * FROM aluguel WHERE patinete = ?`,
    req.params.patinete,
    (err, result) => {
      if (err) {
        console.error(err);
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

// PATCH /aluguel/:id - FINALIZAR um aluguel
app.patch("/aluguel/:id", async (req, res) => {
  try {
    // Recupera hora inicial do aluguel
    const aluguelAtual = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM aluguel WHERE id = ?`,
        req.params.id,
        (err, result) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });
    if (result == null) {
      console.log("Aluguel não encontrado.");
      return res.status(404).send("Aluguel não encontrado.");
    }

    // Calcula valor do aluguel
    const valorTotal = calcularValorAluguel(
      aluguelAtual.inicio,
      req.body.final
    );

    // Atualiza aluguel
    db.run(
      `UPDATE aluguel  
      SET final = COALESCE(?, final), 
      valor = COALESCE(?, valor),
      WHERE id = ?`,
      [req.body.final, valorTotal, req.params.id],
      (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .send("Erro ao atualizar dados finais do aluguel.");
        } else if (this.changes == 0) {
          console.log("Aluguel não encontrado.");
          return res.status(404).send("Aluguel não encontrado.");
        } else {
          return res.status(200).send("Aluguel finalizado com sucesso!");
        }
      }
    );

    // Bloqueia patinete, atualiza disponibilidade e dispara pagamento
    const dadosPagamento = {
      usuario: aluguelAtual.usuario,
      valor: valorTotal,
      cartao: aluguelAtual.cartao,
    };
    await Promise.all([
      alterarDadosExternos(`${urlControlePatinete}/${aluguelAtual.patinete}`, {
        acesso: "bloquear",
      }),
      alterarDadosExternos(`${urlCadastroPatinete}/${aluguelAtual.patinete}`, {
        disponibilidade: "disponível",
        lat: req.body.lat,
        lng: req.body.lng,
      }),
      dispararPagamento(dadosPagamento),
    ]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao obter dados de aluguéis.");
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

// MÉTODOS AUXILIARES
// Alterar dados em microsserviço externo
async function alterarDadosExternos(url, dados) {
  try {
    // Pega parametros e body da requisição e envia para microsserviço via axios
    const resposta = await axios.patch(url, {
      data: dados,
    });
    res.status(200).send(resposta.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao alterar dados externos.");
  }
}

// Disparar pagamento dados em microsserviço externo
async function dispararPagamento(dados) {
  try {
    // Pega parametros e body da requisição e envia para microsserviço via axios
    const resposta = await axios.post(urlServicoPagamento, {
      data: dados,
    });
    res.status(200).send(resposta.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao cadastrar dados de pagamento.");
  }
}

// Calcular valor total do aluguel
function calcularValorAluguel(inicio, final) {
  // Calcula quantos tempo luveou o aluguel (em minutos)
  const tempoInicio = new Date(inicio);
  const tempoFinal = new Date(final);
  const minutosTotal = tempoFinal.getTime() - tempoInicio.getTime() / 60000;

  // Cálculo do valor total (Regra de negócio)
  const taxaFixa = 5.0;
  const taxaMinuto = 0.15;
  const valorTotal = taxaFixa + taxaMinuto * minutosTotal;
  return valorTotal.toFixed(2)
}
