import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const perfis = ['expedicao', 'centro', 'motorista', 'cliente', 'suporte'] as const;
export type Perfil = typeof perfis[number];
export interface Usuario { id: string; perfil: Perfil; centroId: string | null }

@Injectable()
export class Banco implements OnModuleDestroy {
  readonly db: DatabaseSync;
  constructor() {
    const arquivo = resolve(process.env.BANCO || 'dados/rastreamento.sqlite');
    mkdirSync(dirname(arquivo), { recursive: true });
    this.db = new DatabaseSync(arquivo);
    this.db.exec(`
      PRAGMA foreign_keys=ON;
      PRAGMA busy_timeout=5000;
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS centros (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY, perfil TEXT NOT NULL, centroId TEXT REFERENCES centros(id),
        sal TEXT NOT NULL, hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS encomendas (
        id TEXT PRIMARY KEY, clienteId TEXT NOT NULL REFERENCES usuarios(id),
        motoristaId TEXT NOT NULL REFERENCES usuarios(id)
      );
      CREATE TABLE IF NOT EXISTS eventos (
        seq INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE, encomendaId TEXT NOT NULL REFERENCES encomendas(id),
        tipo TEXT NOT NULL, ocorridoEm TEXT NOT NULL, recebidoEm TEXT NOT NULL,
        responsavel TEXT NOT NULL REFERENCES usuarios(id), origem TEXT, centroId TEXT REFERENCES centros(id),
        resultado TEXT, motivo TEXT
      );
      CREATE INDEX IF NOT EXISTS ordem_eventos ON eventos(encomendaId, ocorridoEm, seq);
      CREATE TABLE IF NOT EXISTS comprovantes (
        id TEXT PRIMARY KEY, eventoId TEXT NOT NULL UNIQUE REFERENCES eventos(id), conteudo TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS envios (
        id TEXT PRIMARY KEY, eventoId TEXT NOT NULL REFERENCES eventos(id), assinatura TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS contestacoes (
        id INTEGER PRIMARY KEY, encomendaId TEXT NOT NULL REFERENCES encomendas(id),
        motivo TEXT NOT NULL, abertaEm TEXT NOT NULL, estado TEXT NOT NULL,
        decisao TEXT, justificativa TEXT, responsavel TEXT REFERENCES usuarios(id), decididaEm TEXT
      );
    `);
    this.transacao(() => {
      if (this.db.prepare('SELECT 1 FROM usuarios LIMIT 1').get()) return;
      this.db.exec("INSERT INTO centros (id) VALUES ('CD-01'), ('CD-02')");
      const novo = this.db.prepare('INSERT INTO usuarios VALUES (?, ?, ?, ?, ?)');
      for (const [id, perfil, centro] of [
        ['expedicao', 'expedicao', null], ['centro', 'centro', 'CD-01'],
        ['motorista', 'motorista', null], ['motorista2', 'motorista', null],
        ['cliente', 'cliente', null], ['cliente2', 'cliente', null], ['suporte', 'suporte', null],
      ]) {
        const sal = randomBytes(16).toString('hex');
        novo.run(id, perfil, centro, sal, scryptSync(id + '-09a', sal, 32).toString('hex'));
      }
      this.db.exec("INSERT INTO encomendas VALUES ('ENC-001','cliente','motorista'), ('ENC-002','cliente2','motorista2')");
    });
  }
  transacao<T>(operacao: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const resultado = operacao();
      this.db.exec('COMMIT');
      return resultado;
    } catch (erro) {
      this.db.exec('ROLLBACK');
      throw erro;
    }
  }
  onModuleDestroy() { this.db.close(); }
}
