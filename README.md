# Atividade 3 - Backend
Você deve criar um backend para um aplicativo de aluguel de patinetes elétricos. O backend será composto por cinco microservices, responsáveis pelas funcionalidades descritas a seguir:

## Cadastro de Usuários
Mantém os dados de cada usuário do sistema, como o nome, CPF, e-mail e número de telefone celular.

## Cadastro de Patinetes
Registro dos patinetes, com o número serial do equipamento, status (disponível, alugado ou fora de operação) e suas coordenadas (latitude e longitude); as coordenadas devem ser atualizadas periodicamente pelo patinete, e o usuário poderá obter uma lista com todos os patinetes disponíveis para aluguel próximos à sua localização.

## Controle de Aluguéis
Registra o tempo de início e fim dos aluguéis de patinetes; modifica o status do patinete no início e no fim do aluguel; ativa os serviços de controle de acesso ao patinete no início e no final do aluguel.

## Controle de acesso ao patinete
Bloqueia/debloqueia o patinete no início/fim de cada aluguel (basta imprimir uma mensagem na tela dizendo que o patinete foi bloqueado/desbloqueado).

## Serviço de pagamento
Registra o cartão usado para pagamento e efetua a cobrança ao final do aluguel (basta simular a cobrança e registrar no banco).