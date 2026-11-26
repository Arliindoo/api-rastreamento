# Rastreamento de encomendas · Caso 09A

Projeto da disciplina de Desenvolvimento Back-End. A expedição e o centro registram movimentações, o motorista informa tentativas e entregas, o cliente acompanha a própria encomenda e o suporte decide contestações.

## Rodar no computador

1. Instale o **Node.js 24.x**, com npm. Confira com `node -v`.
2. Extraia o ZIP em uma pasta e abra o terminal nessa pasta, onde estão `package.json` e `package-lock.json`.
3. Execute os dois comandos abaixo. A primeira instalação precisa de internet.

```sh
npm ci
npm start
```

Abra **http://127.0.0.1:3000**. A API NestJS e a página usam o mesmo servidor. O projeto usa o SQLite integrado ao Node 24. O banco é criado em `dados/rastreamento.sqlite` na primeira execução. Reiniciar o servidor preserva o histórico. Para encerrar, pressione Ctrl+C.

## Usar as contas de demonstração

Escolha a conta e a encomenda na coluna de acesso. A página preenche a senha de exemplo, e a API confere a credencial e o vínculo em cada requisição. A senha de cada conta é seu nome seguido de `-09a`, por exemplo `suporte-09a`. As duas encomendas começam sem eventos.

| Conta | Operação | Vínculo inicial |
| --- | --- | --- |
| expedicao | Registrar coleta | Encomendas existentes |
| centro | Registrar entrada e saída | CD-01. CD-02 existe para o teste de acesso a outro centro |
| motorista | Registrar tentativa e entrega | ENC-001 |
| motorista2 | Registrar tentativa e entrega | ENC-002 |
| cliente | Acompanhar e contestar | ENC-001 |
| cliente2 | Acompanhar e contestar | ENC-002 |
| suporte | Consultar provas e decidir contestações | Encomendas da transportadora |

## Roteiro de demonstração

Use **ENC-001** em todas as etapas. Informe a mesma data para os quatro eventos. O campo de horário do front usa a hora local.

1. Como **expedicao**, registre a **coleta** às 08h e informe a origem. Como **centro**, registre a **entrada** no CD-01 às 09h. As duas operações retornam 201 (HU1, CT01 e CT02).
2. Como **motorista**, escolha **Entrega**, informe 12h e preencha o comprovante com “Recebido na portaria por terceiro”. Clique em **Enviar evento** duas vezes. A primeira transmissão retorna 201 e a segunda, 200 (HU2, CT04, CT06 e CT07).
3. Volte a **centro**, escolha **Saída do centro**, informe 10h e envie. Como **cliente**, clique em **Consultar**. O histórico mostra coleta, entrada, saída e entrega nessa ordem. O status é **Entregue** (HU2 e HU3, CT05 e CT08).
4. Como **cliente**, abra uma contestação informando “O pacote foi entregue a outra pessoa”. Como **suporte**, consulte a encomenda, confira o comprovante e registre a decisão com justificativa. Volte a **cliente** e consulte para ler a resposta (HU4 e HU5, CT09 e CT10).
5. Como **cliente2**, consulte **ENC-001**. A API retorna 404. Depois selecione **ENC-002** e tente abrir uma contestação antes de registrar entrega. A API retorna 409. Consulte novamente para verificar o histórico vazio.

## Executar os testes

```sh
npm test
```

Esse comando compila o NestJS, inicia a API em uma porta livre e executa a coleção Postman com o Newman. Depois, envia duas requisições simultâneas e reinicia a API para verificar a persistência. Cada execução usa um banco temporário próprio. Pode rodar o comando com a página aberta.

**Para executar pelo Postman**, importe `testes/09A.postman_collection.json` e `testes/local.postman_environment.json`. Selecione o ambiente **09A · Local**. Rode a coleção inteira na ordem indicada usando o Collection Runner. Ela pressupõe as encomendas iniciais sem histórico e captura automaticamente o ID da contestação.

Para usar o Postman depois da demonstração, inicie uma segunda instância em outro terminal com o banco em um caminho novo. No ambiente do Postman, ajuste `baseUrl` para `http://127.0.0.1:3001`. A cada repetição manual, escolha outro nome de banco ou use `npm test` para fazer essa preparação automaticamente.

**Windows PowerShell**

```powershell
$env:BANCO = "dados/postman-01.sqlite"
$env:PORT = "3001"
npm start
```

**Linux ou macOS**

```sh
BANCO=dados/postman-01.sqlite PORT=3001 npm start
```

## Testar as rotas no Swagger

Com o servidor rodando, abra **http://127.0.0.1:3000/docs**. Clique em **Authorize**, selecione as credenciais HTTP Basic de uma conta da tabela acima, abra uma operação e use **Try it out** para enviar a requisição. Por exemplo, consulte `GET /encomendas/{id}/rastreamento` com `id` igual a `ENC-001` como `cliente`. Depois troque para `cliente2` e repita para observar o erro 404.

O contrato está disponível em **http://127.0.0.1:3000/docs-json** e em `public/openapi.json`. A documentação usa os dados e erros da API, inclusive a autenticação por conta e o corpo de cada tipo de evento.

## Consultar o contrato e as entregas

| Arquivo | Conteúdo |
| --- | --- |
| `public/openapi.json` | Contrato OpenAPI 3.0.3, disponível também em http://127.0.0.1:3000/openapi.json. Pode ser importado no Postman. |
| `docs/Formulario_da_dupla.docx` | Cópia do formulário recebido com RN1 a RN10. |
| `docs/modelagem.md` | Entidades, premissas, requisitos, histórias, critérios de aceite e mapa das rotas. |
| `testes/09A.postman_collection.json` | Requisições CT01 a CT10 e verificações de status, conteúdo e estado persistido. |
| `testes/resultado.txt` | Resultado da execução do projeto empacotado. |
| `src/` e `public/` | Código TypeScript da API e front em HTML, CSS e JavaScript. |

A identificação da turma e da dupla, o endereço do repositório e o acompanhamento das aulas pertencem aos alunos. O formulário recebido mantém esses campos como vieram.
