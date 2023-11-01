// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicia o Servidor
let porta = 8083;
app.listen(porta, () => {
  console.log("Servidor em execução na porta: " + porta);
});

    
// MÉTODOS HTTP
// PATCH /controle/:serial - BLOQUEIA OU DESBLOQUEIA o patinete com base no serial
app.patch("/controle/:serial", (req, res) => {
    if (req.body.acesso === "bloquear") {
        console.log(`Patinete número ${req.params.serial} BLOQUEADO e aguarda novo aluguel.`);
        res.status(200).send(`Patinete número ${req.params.serial} BLOQUEADO e aguarda novo aluguel.`);
    } else if (req.body.acesso === "liberar") {
        console.log(`Patinete número ${req.params.serial} LIBERADO para uso durante aluguel.`);
        res.status(200).send(`Patinete número ${req.params.serial} LIBERADO para uso durante aluguel.`);
    } 
});
