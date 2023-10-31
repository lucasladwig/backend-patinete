const httpProxy = require("express-http-proxy");
const express = require("express");
const app = express();
var logger = require("morgan");

app.use(logger("dev"));

function selectProxyHost(req) {
  if (req.path.startsWith("/usuario")) return "http://localhost:8080/";
  else if (req.path.startsWith("/patinete")) return "http://localhost:8081/";
  else if (req.path.startsWith("/aluguel")) return "http://localhost:8082/";
  else if (req.path.startsWith("/controle")) return "http://localhost:8083/";
  else if (req.path.startsWith("/pagamento")) return "http://localhost:8084/";
  else return null;
}

app.use((req, res, next) => {
  var proxyHost = selectProxyHost(req);
  if (proxyHost == null) res.status(404).send("Serviço não encontrado");
  else httpProxy(proxyHost)(req, res, next);
});

app.listen(8000, () => {
  console.log("API Gateway iniciado!");
});
