// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Axios - para enviar requisições HTTP para outros microsserviços
const axios = require("axios");
const urlCadastroUsuario = "http://localhost:8080/usuario";
const urlCadastroPatinete = "http://localhost:8081/patinete";
const urlControlePatinete = "http://localhost:8083/controle";
const urlServicoPagamento = "http://localhost:8084/pagamento";

// Definições de custo do aluguel
const taxaFixa = 5.0;
const taxaMinuto = 0.15;

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
    console.log("ERRO: não foi possível conectar ao SQLite!");
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
      console.error("Erro ao tentar criar tabela de aluguéis!");
      throw err;
    }
  }
);

// MÉTODOS CRUD HTTP
// POST /aluguel - INICIAR um novo aluguel
app.post("/aluguel", async (req, res) => {
  try {
    const serialPatinete = req.body.patinete;
    const cpfUsuario = req.body.usuario;
    // Busca usuário e patinete nos bancos de dados
    const [patineteAlvo, usuarioAlvo] = await Promise.all([
      axios.get(`${urlCadastroPatinete}/${serialPatinete}`),
      axios.get(`${urlCadastroUsuario}/${cpfUsuario}`),
    ]);
    // Verifica se patinete e usuário existem
    if (patineteAlvo.data && usuarioAlvo.data) {
      // Verifica se patinetes está disponível
      if (patineteAlvo.data.disponibilidade === "disponível") {
        db.run(
          `INSERT INTO aluguel(patinete, usuario, cartao) VALUES(?, ?, ?)`,
          [serialPatinete, cpfUsuario, req.body.cartao]
        );

        // Libera patinete e atualiza sua disponibilidade
        await Promise.all([
          alterarDadosExternos(
            `${urlControlePatinete}/${serialPatinete}`,
            { acesso: "liberar" },
            res
          ),
          alterarDadosExternos(
            `${urlCadastroPatinete}/${serialPatinete}`,
            { disponibilidade: "em uso" },
            res
          ),
        ]);

        console.log(`Aluguel iniciado com sucesso! Cobrança iniciando agora...\nCUSTO: R\$${taxaFixa} + R\$${taxaMinuto} por minuto.`);
        res.status(200).send("Aluguel iniciado com sucesso!");
        return;
      } else {
        console.log(`Patinete id ${serialPatinete} indisponível!`);
        res.status(500).send(`Patinete id ${serialPatinete} indisponível!`);
        return;
      }
    } else {
      console.log(`Usuário cpf ${cpfUsuario} ou patinete serial ${serialPatinete} não existem!`);
      res.status(500).send("Usuário ou patinete não existem!");
      return;
    }
  } catch (err) {
    console.error(err);
    return;
  }
});

// GET /aluguel - RETORNAR todos os aluguéis
app.get("/aluguel", (req, res) => {
  db.all(`SELECT * FROM aluguel`, [], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao acessar tabela de aluguéis!");
    } else if (result.length === 0) {
      console.log("Lista de aluguéis vazia!");
      res.status(500).send("Lista de aluguéis vazia!");
    } else {
      console.log("Lista de aluguéis encontrada!");
      res.status(200).json(result);
    }
  });
});

// GET /aluguel/:id - RETORNAR aluguel com base no id
app.get("/aluguel/:id", (req, res) => {
  db.get(`SELECT * FROM aluguel WHERE id = ?`, req.params.id, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send(`Erro ao obter aluguel id ${req.params.id}!`);
    } else if (result == null) {
      console.log(`Aluguel id ${req.params.id} não encontrado!`);
      res.status(404).send(`Aluguel id ${req.params.id} não encontrado!`);
    } else {
      console.log(`Aluguel id ${req.params.id} encontrados!`);
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
        res
          .status(500)
          .send(`Erro ao obter aluguéis do usuario cpf ${req.params.usuario}!`);
      } else if (result == null) {
        console.log(
          `Nenhum aluguel do usuario cpf ${req.params.usuario} encontrado!`
        );
        res
          .status(404)
          .send(
            `Nenhum aluguel do usuario cpf ${req.params.usuario} encontrado!`
          );
      } else {
        console.log(
          `Alugueis do usuario cpf ${req.params.cpf} encontrados!`
        );
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
        res
          .status(500)
          .send(
            `Erro ao obter aluguéis do patinete serial ${req.params.patinete}!`
          );
      } else if (result == null) {
        console.log(
          `Nenhum aluguel do patinete serial ${req.params.patinete} encontrado!`
        );
        res
          .status(404)
          .send(
            `Nenhum aluguel do patinete serial ${req.params.patinete} encontrado!`
          );
      } else {
        console.log(
          `Alugueis do patinete serial ${req.params.patinete} encontrados!`
        );
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
    if (aluguelAtual == null) {
      console.log(`Aluguel id ${req.params.id} não encontrado!`);
      res.status(404).send(`Aluguel id ${req.params.id} não encontrado!`);
      return;
    }

    // Calcula valor do aluguel
    const valorTotal = calcularValorAluguel(
      aluguelAtual.inicio,
      req.body.final
    );

    // Atualiza aluguel
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE aluguel  
        SET final = COALESCE(?, final), 
        valor = COALESCE(?, valor)
        WHERE id = ?`,
        [req.body.final, valorTotal, req.params.id],
        (err, result) => {
          if (err) {
            console.error(err);
            res
              .status(500)
              .send(
                `Erro ao encerrar aluguel id ${req.params.id} no banco de dados!`
              );
            reject(err);
          } else if (this.changes == 0) {
            console.log(`Aluguel id ${req.params.id} não encontrado!`);
            res.status(404).send(`Aluguel id ${req.params.id} não encontrado!`);
            reject(err);
          } else {
            console.log(`Aluguel id ${req.params.id} encerrado com sucesso!`);
            res
              .status(200)
              .send(`Aluguel id ${req.params.id} encerrado com sucesso!`);
            resolve(result);
          }
        }
      );
    });

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
      processarPagamento(dadosPagamento),
    ]);
  } catch (error) {
    console.error(error);
  }
});

// DELETE /aluguel/:id - REMOVER um aluguel do cadastro
app.delete("/aluguel/:id", (req, res) => {
  db.run(`DELETE FROM aluguel WHERE id = ?`, req.params.id, function (err) {
    if (err) {
      console.error(err);
      res.status(500).send(`Erro ao remover aluguel id ${req.params.id}!`);
    } else if (this.changes == 0) {
      console.log(`Aluguel id ${req.params.id} não encontrado!`);
      res.status(404).send(`Aluguel id ${req.params.id} não encontrado!`);
    } else {
      console.log(`Aluguel id ${req.params.id} removido com sucesso!`);
      res.status(200).send(`Aluguel id ${req.params.id} removido com sucesso!`);
    }
  });
});

// MÉTODOS AUXILIARES
// Alterar dados em microsserviço externo
async function alterarDadosExternos(url, dados, res) {
  try {
    // Pega parametros e body da requisição e envia para microsserviço via axios
    const resposta = await axios.patch(url, dados);
    console.log("Dados externos alterados com sucesso!");
    // res.status(200).send(resposta.data);
  } catch (err) {
    console.error(err);
    // res.status(500).send("Erro ao alterar dados externos!");
  }
}

// Disparar pagamento dados em microsserviço externo
async function processarPagamento(dados, res) {
  try {
    // Pega parametros e body da requisição e envia para microsserviço via axios
    // const resposta = await axios.post(urlServicoPagamento, dados);
    await axios.post(urlServicoPagamento, dados);
    console.log("Pagamento processado com sucesso!");
    // res.status(200).send(resposta.data);
  } catch (err) {
    console.error(err);
    // res.status(500).send("Erro ao processar novo pagamento!");
  }
}

// Calcular valor total do aluguel
function calcularValorAluguel(inicio, final) {
  // Calcula quantos tempo levou o aluguel (em minutos)
  const tempoInicio = new Date(inicio);
  const tempoFinal = new Date(final);
  const minutosTotal = (tempoFinal.getTime() - tempoInicio.getTime()) / 60000;

  // Cálculo do valor total
  const valorTotal = taxaFixa + taxaMinuto * minutosTotal;
  return valorTotal.toFixed(2);
}
