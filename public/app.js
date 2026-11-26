'use strict';
const el = id => document.getElementById(id);
const nomes = { COLETA: 'Coleta', ENTRADA: 'Entrada no centro', SAIDA: 'Saída do centro', TENTATIVA: 'Tentativa de entrega', ENTREGA: 'Entrega' };
const porPerfil = { expedicao: ['COLETA'], centro: ['ENTRADA', 'SAIDA'], motorista: ['TENTATIVA', 'ENTREGA'] };
const orientacoes = {
  expedicao: ['Comece pela coleta', 'Registre a coleta com a origem e a hora em que aconteceu.', 'Depois, escolha a conta do centro de distribuição para registrar a entrada.'],
  centro: ['Acompanhe a passagem pelo centro', 'Registre a entrada e a saída no centro CD-01. A hora do fato pode ser anterior à hora do envio.', 'Para testar um evento atrasado, registre a saída depois da entrega com um horário anterior.'],
  motorista: ['Informe a entrega', 'Registre uma tentativa sem sucesso ou uma entrega com comprovante. Confira a encomenda atribuída à sua conta.', 'Depois da entrega, use a conta do cliente para consultar o percurso.'],
  cliente: ['Consulte sua encomenda', 'Atualize o histórico para ver os eventos em ordem cronológica e as respostas do suporte.', 'Se a entrega já foi registrada e há um problema, abra uma contestação abaixo.'],
  suporte: ['Investigue e responda', 'Consulte o histórico completo e o comprovante para verificar o relato do cliente.', 'Depois que houver uma contestação aberta, registre a decisão e a justificativa.'],
};
const perfil = () => el('conta').value.replace(/2$/, '');
const rota = () => '/encomendas/' + el('encomenda').value;
let versao = 0;
const data = iso => new Date(iso).toLocaleString('pt-BR');
function aviso(texto = '', erro = false) {
  el('aviso').className = erro ? 'erro' : '';
  el('aviso').textContent = texto;
}
function opcoes(select, valores) {
  select.replaceChildren(...valores.map(([valor, nome]) => new Option(nome, valor)));
}
function campo(id, nome, tamanho, valor = '') {
  const label = document.createElement('label');
  label.textContent = nome;
  const input = document.createElement('input');
  Object.assign(input, { id, required: true, maxLength: tamanho, value: valor });
  label.append(input);
  return label;
}
function novo() {
  el('eventoId').value = crypto.randomUUID();
  const agora = new Date();
  el('hora').value = new Date(+agora - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  const tipo = el('tipo').value;
  let campos = [];
  if (tipo === 'COLETA') campos = [campo('origem', 'Origem da coleta', 150)];
  if (['ENTRADA', 'SAIDA'].includes(tipo)) campos = [campo('centroId', 'Centro de distribuição', 64, 'CD-01')];
  if (tipo === 'TENTATIVA') campos = [campo('resultado', 'Resultado da tentativa', 150), campo('motivo', 'Motivo', 500)];
  if (tipo === 'ENTREGA') campos = [campo('provaId', 'Identificador do comprovante', 64, crypto.randomUUID()), campo('conteudo', 'Conteúdo do comprovante', 2000)];
  el('campos').replaceChildren(...campos);
}
function limpar() {
  versao++;
  aviso();
  el('historico').replaceChildren(no('p', 'Consulte a encomenda para carregar o histórico.', 'ajuda'));
  el('contestacaoId').replaceChildren();
  el('decidir').hidden = true;
  el('contestar').reset();
  el('decisaoForm').reset();
}
function configurar() {
  limpar();
  const p = perfil();
  const [titulo, descricao, proximo] = orientacoes[p];
  el('acaoTitulo').textContent = titulo;
  el('acaoDescricao').textContent = descricao;
  el('proximosPassos').textContent = proximo;
  el('registro').hidden = !porPerfil[p];
  el('consulta').hidden = !['cliente', 'suporte'].includes(p);
  el('abrir').hidden = p !== 'cliente';
  el('contestar').querySelector('button').disabled = p === 'cliente';
  el('tituloConsulta').textContent = p === 'suporte' ? 'Investigação da encomenda' : 'Meu rastreamento';
  if (porPerfil[p]) {
    opcoes(el('tipo'), porPerfil[p].map(tipo => [tipo, nomes[tipo]]));
    novo();
  }
}
async function api(caminho, metodo = 'GET', corpo) {
  const resposta = await fetch(caminho, {
    method: metodo,
    headers: { Authorization: 'Basic ' + btoa(el('conta').value + ':' + el('senha').value), 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    const mensagens = {
      401: 'Verifique a senha desta conta.',
      403: 'Esta conta não tem permissão para esta ação ou encomenda.',
      404: 'Esta encomenda não existe ou não pertence a este cliente.',
      409: typeof dados.message === 'string' ? dados.message : 'Existe um conflito com o estado atual da encomenda.',
    };
    throw Error(resposta.status + ' · ' + (mensagens[resposta.status] || dados.message));
  }
  return { dados, status: resposta.status };
}
function acao(id, evento, executar) {
  el(id).addEventListener(evento, async ev => {
    ev.preventDefault();
    const atual = versao;
    const botao = ev.submitter || ev.currentTarget;
    botao.disabled = true;
    aviso();
    try { const msg = await executar(); if (atual === versao && msg) aviso(msg); }
    catch (erro) { if (atual === versao) aviso(erro.message, true); }
    finally { botao.disabled = false; }
  });
}
function no(tag, texto, classe = '') {
  const node = document.createElement(tag);
  node.textContent = texto;
  node.className = classe;
  return node;
}
async function consultar() {
  const suporte = perfil() === 'suporte';
  const atual = versao;
  const { dados } = await api(rota() + (suporte ? '/eventos' : '/rastreamento'));
  if (atual !== versao) return;
  const lista = el('historico');
  lista.replaceChildren();
  if (dados.status) lista.append(no('p', 'Situação atual · ' + dados.status, 'estado'));
  if (!dados.eventos.length) lista.append(no('p', 'Nenhum evento registrado.', 'ajuda'));
  for (const e of dados.eventos) {
    const item = no('div', '', 'item');
    item.append(no('strong', nomes[e.tipo]), no('small', 'Aconteceu em ' + data(e.ocorridoEm)));
    if (suporte) {
      item.append(no('small', 'Recebido em ' + data(e.recebidoEm) + ' · ' + e.responsavel + ' · ' + e.id));
      for (const chave of ['origem', 'centroId', 'resultado', 'motivo']) if (e[chave]) item.append(no('small', e[chave]));
      if (e.comprovanteId) item.append(no('small', 'Comprovante ' + e.comprovanteId + ' · ' + e.comprovanteConteudo));
    }
    lista.append(item);
  }
  if (dados.contestacoes.length) lista.append(no('h3', 'Contestações'));
  for (const c of dados.contestacoes) {
    const item = no('div', '', 'item');
    item.append(no('strong', '#' + c.id + ' · ' + c.estado), no('small', c.motivo + ' · ' + data(c.abertaEm)));
    if (c.decisao) item.append(no('p', c.decisao + ' · ' + c.justificativa));
    lista.append(item);
  }
  const abertas = dados.contestacoes.filter(c => c.estado === 'Aberta');
  el('decidir').hidden = !suporte || !abertas.length;
  opcoes(el('contestacaoId'), abertas.map(c => [c.id, '#' + c.id + ' · ' + c.motivo]));
  if (!suporte && dados.status) {
    el('contestar').querySelector('button').disabled = dados.status !== 'Entregue';
  }
}
acao('buscar', 'click', consultar);
acao('evento', 'submit', async () => {
  const tipo = el('tipo').value;
  const corpo = { id: el('eventoId').value, tipo, ocorridoEm: new Date(el('hora').value).toISOString() };
  for (const chave of ['origem', 'centroId', 'resultado', 'motivo']) if (el(chave)) corpo[chave] = el(chave).value;
  if (tipo === 'ENTREGA') corpo.comprovante = { id: el('provaId').value, conteudo: el('conteudo').value };
  const { status } = await api(rota() + '/eventos', 'POST', corpo);
  return status === 201 ? 'Evento registrado (201).' : 'Reenvio reconhecido (200). O histórico foi preservado.';
});
acao('contestar', 'submit', async () => {
  const atual = versao;
  const { dados } = await api(rota() + '/contestacoes', 'POST', { motivo: el('motivoContestacao').value });
  if (versao !== atual) return;
  el('contestar').reset();
  await consultar();
  return 'Contestação #' + dados.id + ' aberta.';
});
acao('decisaoForm', 'submit', async () => {
  const atual = versao;
  await api('/contestacoes/' + el('contestacaoId').value, 'PATCH', { decisao: el('decisao').value, justificativa: el('justificativa').value });
  if (versao !== atual) return;
  el('decisaoForm').reset();
  await consultar();
  return 'Decisão registrada e disponível no rastreamento do cliente.';
});
el('conta').onchange = () => { el('senha').value = el('conta').value + '-09a'; configurar(); };
el('encomenda').onchange = configurar;
el('senha').oninput = limpar;
el('novo').onclick = () => { aviso(); novo(); };
el('tipo').onchange = el('novo').onclick;
configurar();
