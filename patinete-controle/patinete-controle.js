// Inicia o Express.js
const express = require("express");
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicia o Servidor na porta 8083
let porta = 8083;
app.listen(porta, () => {
  console.log("Servidor em execução na porta: " + porta);
});

    
// MÉTODOS HTTP
// PATCH /controle/:serial - BLOQUEIA OU DESBLOQUEIA o patinete com base no serial
app.patch("/controle/:serial", (req, res) => {
    if (req.body.disponibilidade === "disponivel") {
        console.log(`Patinete ${req.params.serial} foi bloqueado e aguarda novo aluguel.`);
        res.status(200).send(`Patinete ${req.params.serial} foi bloqueado e aguarda novo aluguel.`);
    } else if (req.body.disponibilidade === "em uso") {
        console.log(`Patinete ${req.params.serial} foi desbloqueado para uso durante aluguel.`);
        res.status(200).send(`Patinete ${req.params.serial} foi desbloqueado para uso durante aluguel.`);
    } else if (req.body.disponibilidade === "fora de serviço") {
        console.log(`Patinete ${req.params.serial} está fora de serviço.`);
        res.status(200).send(`Patinete ${req.params.serial} está fora de serviço.`);
    }
});
