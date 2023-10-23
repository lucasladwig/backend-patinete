# Atividade 3 - Backend

Você deve criar um backend para um aplicativo de aluguel de patinetes elétricos. O backend será composto por cinco microservices, responsáveis pelas funcionalidades descritas a seguir:

## Descrição dos Serviços

### Cadastro de Usuários

Registro dos dados pessoais de cada usuário do sistema.
Atributos:

- CPF (chave primária)
- Nome
- E-mail
- Telefone celular

### Cadastro de Patinetes

Registro dos dados dos patinetes, sendo que seus dados de localização devem ser atualizados periodicamente pelo patinete, e o usuário poderá obter uma lista com todos os patinetes disponíveis para aluguel próximos à sua localização.

Atributos:

- Número serial do equipamento (chave primária),
- Status: disponível, em uso ou fora de operação
- Coordenadas: latitude e longitude;

### Controle de Aluguéis

Registra o tempo de início e fim dos aluguéis de patinetes; modifica o status do patinete no início e no fim do aluguel; ativa os serviços de controle de acesso ao patinete no início e no final do aluguel.

Atributos:

- Hora de início
- Hora de fim
- CPF usuário
- Serial patinete

### Controle de acesso ao patinete

Bloqueia/debloqueia o patinete no início/fim de cada aluguel (basta imprimir uma mensagem na tela dizendo que o patinete foi bloqueado/desbloqueado).

### Serviço de pagamento

Registra o cartão usado para pagamento e efetua a cobrança ao final do aluguel (basta simular a cobrança e registrar no banco).

## Titulo

Considere que o backend do sistema poderá ser acessado tanto pelo aplicativo do usuário, para localização de patinetes, desbloqueio e pagamento, quanto pelo hardware do patinete, para envio de localização e bloqueio/desbloqueio. Nessa atividade não será necessário implementar estes frontends; verificaremos o funcionamento do backend enviando requisições de teste aos serviços a partir de ferramentas como o Postman.

Os microservices devem ser acessados por meio de um API gateway, que deve fornecer uma interface REST para acesso aos serviços. Sugere-se que as interações do gateway com os microservices também sejam feitas por meio de requisições REST.

O uso de outras tecnologias que não foram vistas na disciplina, como serviços de mensageria (RabbitMQ, Kafka, ...), Thrift e gRPC, também é permitido, caso você já domine a tecnologia que deseja utilizar.

O API gateway e os microservices podem ser implementados utilizando o Node.js ou qualquer outra tecnologia que você domine. Como servidor de banco de dados podem ser usados o SQLite (vide tutorial) ou qualquer outro banco de dados que você saiba utilizar.

Cada serviço deve ter seu banco de dados, database ou collection própria, de modo que um microservice não deverá acessar os dados de outro. Sempre que for necessário ler ou alterar um dado de outro serviço, deve ser enviada uma requisição a ele (Dica: use o Axios para enviar uma requisição REST para outro microservice).
