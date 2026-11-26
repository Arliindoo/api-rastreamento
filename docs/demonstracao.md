# Demonstração do caso 09A

Com a aplicação iniciada, abra http://127.0.0.1:3000. Para seguir o roteiro desde a coleta, use um banco novo. Veja as opções de configuração no [README](../README.md).

## Contas de demonstração
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
