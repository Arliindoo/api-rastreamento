const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createInterface } = require('node:readline');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const newman = require('newman');
const colecao = require('./09A.postman_collection.json');
const ambiente = require('./local.postman_environment.json');

async function iniciar(banco) {
  const filho = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, PORT: '0', BANCO: banco }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  const linhas = createInterface({ input: filho.stdout });
  const limite = setTimeout(() => filho.kill(), 20000);
  try {
    for await (const linha of linhas) {
      const url = linha.match(/Rastreamento disponível em (http:\/\/127\.0\.0\.1:\d+)/);
      if (url) return { filho, base: url[1] };
    }
    throw Error('A API de teste não iniciou.');
  } finally { clearTimeout(limite); }
}
async function parar(filho) {
  if (filho.exitCode !== null || filho.signalCode !== null) return;
  const terminou = once(filho, 'exit');
  filho.kill();
  await terminou;
}
test('Coleção CT01 a CT10, reenvio simultâneo e persistência', async t => {
  const pasta = await mkdtemp(join(tmpdir(), 'rastreamento-09a-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  const arquivo = join(pasta, 'teste.sqlite');
  let api = await iniciar(arquivo);
  try {
    const relatorio = await new Promise((ok, falha) => newman.run({
      collection: colecao, environment: ambiente, envVar: [{ key: 'baseUrl', value: api.base }],
    }, (erro, resumo) => erro ? falha(erro) : ok(resumo)));
    for (const execucao of relatorio.run.executions) {
      t.diagnostic(execucao.item.name + ' → HTTP ' + execucao.response?.code);
    }
    assert.deepEqual(relatorio.run.failures.map(f => f.source.name + ': ' + f.error.message), []);
    t.diagnostic(relatorio.run.stats.requests.total + ' requisições e ' + relatorio.run.stats.assertions.total + ' verificações Postman aprovadas.');

    const headers = usuario => ({
      'Authorization': 'Basic ' + Buffer.from(usuario + ':' + usuario + '-09a').toString('base64'),
      'Content-Type': 'application/json',
    });
    const enviar = () => fetch(api.base + '/encomendas/ENC-002/eventos', {
      method: 'POST', headers: headers('expedicao'),
      body: JSON.stringify({ id: 'paralelo', tipo: 'COLETA', origem: 'Expedição', ocorridoEm: '2026-11-20T07:00:00Z' }),
    });
    const respostas = await Promise.all([enviar(), enviar()]);
    assert.deepEqual(respostas.map(r => r.status).sort(), [200, 201]);
    const inicio = performance.now();
    const consulta = await fetch(api.base + '/encomendas/ENC-002/rastreamento', { headers: headers('cliente2') });
    assert.equal(consulta.status, 200);
    const resumo = await consulta.json();
    assert.equal(resumo.eventos.length, 2);
    assert.equal(resumo.eventos[0].tipo, 'COLETA');
    const tempo = performance.now() - inicio;
    assert.ok(tempo <= 2000, 'Consulta do evento recém-confirmado excedeu 2 s.');
    t.diagnostic('RNF1: primeira consulta após a confirmação já trouxe o evento em ' + Math.round(tempo) + ' ms.');
    await parar(api.filho);
    api = await iniciar(arquivo);
    const leitura = await fetch(api.base + '/encomendas/ENC-002/eventos', { headers: headers('suporte') });
    assert.equal(leitura.status, 200);
    const historico = await leitura.json();
    assert.equal(historico.eventos.filter(e => e.id === 'paralelo').length, 1);
    assert.equal(historico.eventos.length, 2);
    t.diagnostic('Reenvio simultâneo retornou 201/200. Histórico preservado após reiniciar a API.');
  } finally { await parar(api.filho); }
});
