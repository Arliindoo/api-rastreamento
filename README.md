# API de rastreamento de encomendas

Projeto da disciplina de Desenvolvimento Back-End para o caso 09A. A expedição e o centro de distribuição registram movimentações, o motorista informa tentativas e entregas, o cliente acompanha a encomenda e o suporte analisa contestações.

A API usa NestJS, TypeScript e SQLite. O mesmo servidor disponibiliza a interface web e a documentação Swagger.

## Executar localmente

Instale o Node.js 24 e execute na raiz do repositório.

```sh
npm ci
npm start
```

| Recurso | Endereço |
| --- | --- |
| Interface web | <http://127.0.0.1:3000> |
| Swagger UI | <http://127.0.0.1:3000/docs> |
| Contrato OpenAPI | <http://127.0.0.1:3000/docs-json> |

A aplicação cria o banco em `dados/rastreamento.sqlite` na primeira execução e preserva o histórico entre reinicializações. O servidor escuta em `127.0.0.1`. Use `PORT` para alterar a porta e `BANCO` para indicar outro arquivo SQLite.

A API usa autenticação HTTP Basic. Para consultar `ENC-001` no Swagger, clique em **Authorize**, use o usuário `cliente` com a senha `cliente-09a` e execute `GET /encomendas/{id}/rastreamento`. O [roteiro de demonstração](docs/demonstracao.md) lista as contas e percorre o fluxo da coleta até a decisão de uma contestação.

## Testes

```sh
npm test
```

O comando compila a aplicação, inicia a API em uma porta livre e usa um banco temporário. A suíte executa a coleção Postman com Newman e verifica o reenvio simultâneo de eventos e a persistência após reiniciar a API.

Para rodar manualmente, importe a [coleção](testes/09A.postman_collection.json) e o [ambiente](testes/local.postman_environment.json) no Postman. Selecione **09A · Local** e execute a coleção inteira em ordem com o Collection Runner. A coleção espera um banco novo, com as encomendas iniciais sem eventos. Se a demonstração já tiver sido executada, use outra instância e ajuste o `baseUrl` no Postman.

```sh
BANCO=dados/postman-01.sqlite PORT=3001 npm start
```

No PowerShell, use `$env:BANCO = "dados/postman-01.sqlite"` e `$env:PORT = "3001"` antes de rodar `npm start`. Escolha um caminho de banco novo a cada execução manual da coleção.

## Estrutura

| Diretório | Conteúdo |
| --- | --- |
| [src/](src/) | API NestJS, regras de rastreamento e acesso ao SQLite |
| [public/](public/) | Interface web e [contrato OpenAPI](public/openapi.json) |
| [testes/](testes/) | Coleção Postman e suíte de integração |
| [docs/](docs/) | [Modelagem do caso 09A](docs/modelagem.md) e roteiro de demonstração |
