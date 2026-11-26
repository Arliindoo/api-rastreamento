# Caso 09A · Modelo e critérios de aceite

A operação precisa reconstruir o caminho de uma encomenda quando o motorista perde conexão. No caso do catálogo, a baixa de entrega chega antes da saída do centro, o motorista reenvia um comprovante e o cliente relata que outra pessoa recebeu o pacote. As fichas RN1 a RN10 da dupla detalham quem pode registrar cada fato e como preservar o histórico.

## Requisitos funcionais e histórias

| RF / história | Ação e benefício para o ator | Sucesso observável | Falha de negócio ou segurança |
| --- | --- | --- | --- |
| RF1 e RF2 / HU1 | Como expedição ou operador de centro, quero registrar coleta, entrada e saída para identificar onde a encomenda passou. | Evento gravado com responsável e horário, HTTP 201. | Encomenda inexistente gera 404. Centro inexistente gera 400. Operador de outra unidade recebe 403. |
| RF3 e RF4 / HU2 | Como motorista, quero informar tentativa e conclusão e reenviar registros após reconectar para manter o histórico confiável. | Tentativa preserva motivo e resultado. Entrega exige comprovante. Reenvio idêntico devolve o recibo original. | Dados obrigatórios ausentes geram 400. Reenvio divergente gera 409. Motorista de outra encomenda recebe 403. |
| RF5 / HU3 | Como cliente, quero consultar minha encomenda para entender o percurso e o estado atual. | Eventos resumidos em ordem do fato, com decisões de contestações próprias. | Recurso inexistente ou alheio gera 404. Credencial inválida gera 401. |
| RF6 / HU4 | Como cliente, quero contestar a entrega da minha encomenda para comunicar que outra pessoa recebeu o pacote. | Contestação criada como Aberta com data e motivo. Eventos preservados. | Antes da entrega, 409. Para encomenda alheia, 404. |
| RF7 / HU5 | Como suporte, quero conferir os registros e o comprovante para justificar uma decisão ao cliente. | Consulta interna exibe evidências. Decisão registra data, responsável e justificativa e fica visível ao cliente. | Novo parecer sobre contestação decidida gera 409. Outro perfil recebe 403 ao tentar decidir. |

## Mapa das dez regras

| Regra | História | Método e rota | Verificação |
| --- | --- | --- | --- |
| RN1 · Coleta | HU1 | POST /encomendas/{id}/eventos | CT01 · Origem e atribuição à expedição |
| RN2 · Movimentação | HU1 | POST /encomendas/{id}/eventos | CT02 · Entrada, saída e vínculo com o centro |
| RN3 · Tentativa | HU2 | POST /encomendas/{id}/eventos | CT03 · Resultado e motivo obrigatórios |
| RN4 · Entrega | HU2 | POST /encomendas/{id}/eventos | CT04 · Comprovante obrigatório e status Entregue |
| RN5 · Atraso | HU2, HU3 | POST /encomendas/{id}/eventos e GET /encomendas/{id}/rastreamento | CT05 · Horários do fato e do recebimento |
| RN6 · Reenvio de evento | HU2 | POST /encomendas/{id}/eventos | CT06 · 200 para repetição e 409 para divergência |
| RN7 · Reenvio de comprovante | HU2 | POST /encomendas/{id}/eventos | CT07 · Prova única, inclusive com novo ID de transmissão |
| RN8 · Consulta restrita | HU3 | GET /encomendas/{id}/rastreamento | CT08 · Dono consulta e outro cliente recebe 404 |
| RN9 · Contestação | HU4 | POST /encomendas/{id}/contestacoes | CT09 · Exige entrega, estado inicial Aberta |
| RN10 · Decisão | HU5 | GET /encomendas/{id}/eventos e PATCH /contestacoes/{id} | CT10 · Evidência privada, decisão única pelo suporte |

## Entidades e integridade

| Relação | Persistência e significado |
| --- | --- |
| Cliente 1:N Encomenda e Motorista 1:N Encomenda | Cada encomenda da base de demonstração tem um cliente e um motorista atribuídos. Cliente, expedição, operador de centro, motorista e suporte são perfis de usuário. |
| Centro 1:N Operador e Centro 1:N Evento de movimentação | O centro precisa existir e corresponder à unidade do operador. |
| Encomenda 1:N Evento | Cada evento referencia o responsável. A tentativa é um tipo de evento com resultado e motivo. A origem da coleta e o centro de entrada ou saída são registrados conforme o tipo. |
| Evento de entrega 1:1 Comprovante | Identificador global de prova e vínculo único de entrega. O conteúdo é um recibo textual privado. |
| Evento 1:N Envio reconhecido | Cada ID de transmissão registra o evento original e a assinatura dos dados normalizados, da encomenda e do responsável. |
| Encomenda 1:N Contestação | Aberta → Decidida. Datas, motivo e decisão permanecem vinculados à encomenda. A decisão registra o usuário do suporte. |

As chaves estrangeiras do SQLite verificam os vínculos. A criação de evento, comprovante e identificação de reenvio ocorre na mesma transação. O bloqueio de escrita precede a consulta de duplicidade. Uma falha desfaz a operação inteira.

O servidor grava o horário de recebimento. O horário do fato é informado com fuso e convertido para UTC. O histórico é ordenado por horário do fato e, em empate, pela sequência de gravação. O status da encomenda vem dos eventos gravados. A existência da entrega mantém o estado Entregue quando chega uma movimentação atrasada. Contestar e decidir acrescentam informações sem editar os fatos anteriores.

## Premissas da versão demonstrada

O formulário exige comprovante para a entrega e entrega registrada para abrir contestação. O formato textual do comprovante, a atribuição de um motorista por encomenda e a consulta da decisão no próprio rastreamento são decisões de implementação para os cinco endpoints definidos. A transportadora e o professor podem validar essas escolhas. A unidade de rastreamento é a encomenda. O catálogo sugere investigar volumes e rotas, e as dez fichas da dupla operam no nível da encomenda.

A autenticação HTTP Basic atende às contas de teste locais. O servidor escuta no endereço de loopback e verifica a senha por scrypt com sal individual. Os retornos do cliente usam apenas os campos do acompanhamento e da contestação. A consulta de evidências e dos responsáveis é reservada ao suporte.

## Requisitos não funcionais verificáveis

| ID | Condição e meta | Verificação |
| --- | --- | --- |
| RNF1 | No cenário local com uma encomenda, assim que a API confirmar o evento recebido após reconexão, a primeira consulta deve mostrá-lo em até 2 s. Prazo proposto para o roteiro em sala, permitindo consultar na mesma interação. | O teste automatizado mede a primeira consulta após o reenvio simultâneo e verifica o evento retornado. |
| RNF2 | Dois envios simultâneos e idênticos devem produzir um único evento persistido, inclusive após reiniciar a API. | O teste envia duas requisições em paralelo, exige 201 e 200 e confere a quantidade após a reinicialização. |
| RNF3 | A consulta de histórico do cliente deve expor zero campos privados de evento. | CT08 compara as chaves de cada evento com tipo e ocorridoEm e verifica o acesso negado aos detalhes internos. |
