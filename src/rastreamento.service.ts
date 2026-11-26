import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Banco, Perfil, Usuario } from './banco';
import { lerEvento, objeto, texto, Tipo } from './entrada';

const perfilDoEvento: Record<Tipo, Perfil> = {
  COLETA: 'expedicao', ENTRADA: 'centro', SAIDA: 'centro', TENTATIVA: 'motorista', ENTREGA: 'motorista',
};
const situacao: Record<Tipo, string> = {
  COLETA: 'Coletada', ENTRADA: 'No centro', SAIDA: 'Em trânsito', TENTATIVA: 'Tentativa de entrega', ENTREGA: 'Entregue',
};

@Injectable()
export class RastreamentoService {
  constructor(private readonly banco: Banco) {}
  private get db() { return this.banco.db; }

  private exigirPerfil(u: Usuario, perfil: Perfil) {
    if (u.perfil !== perfil) throw new ForbiddenException('Perfil sem permissão para esta operação.');
  }
  private encomenda(id: string, cliente?: Usuario) {
    const registro = this.db.prepare('SELECT * FROM encomendas WHERE id=?').get(id);
    if (!registro || (cliente && registro.clienteId !== cliente.id))
      throw new NotFoundException('Encomenda indisponível.');
    return registro;
  }

  registrar(id: string, u: Usuario, corpo: unknown) {
    const e = lerEvento(corpo);
    this.exigirPerfil(u, perfilDoEvento[e.tipo]);
    return this.banco.transacao(() => {
      const encomenda = this.encomenda(id);
      if (u.perfil === 'motorista' && encomenda.motoristaId !== u.id)
        throw new ForbiddenException('Motorista sem vínculo com esta encomenda.');
      if (e.centroId) {
        if (!this.db.prepare('SELECT id FROM centros WHERE id=?').get(e.centroId))
          throw new BadRequestException('Centro inexistente.');
        if (e.centroId !== u.centroId) throw new ForbiddenException('Operador de outro centro.');
      }
      const { id: envioId, ...dados } = e;
      const assinatura = createHash('sha256').update(JSON.stringify([id, u.id, dados])).digest('hex');
      const anterior = this.db.prepare('SELECT * FROM envios WHERE id=?').get(envioId);
      if (anterior) {
        if (anterior.assinatura !== assinatura) throw new ConflictException('O identificador já possui outros dados.');
        return { codigo: 200, evento: this.evento(String(anterior.eventoId)) };
      }
      const prova = e.comprovante && this.db.prepare(
        'SELECT p.eventoId, a.assinatura FROM comprovantes p JOIN envios a ON a.id=p.eventoId WHERE p.id=?'
      ).get(e.comprovante.id);
      if (prova) {
        if (prova.assinatura !== assinatura) throw new ConflictException('Comprovante já vinculado com dados diferentes.');
        this.db.prepare('INSERT INTO envios VALUES (?,?,?)').run(envioId, prova.eventoId, assinatura);
        return { codigo: 200, evento: this.evento(String(prova.eventoId)) };
      }
      this.db.prepare(`INSERT INTO eventos
        (id,encomendaId,tipo,ocorridoEm,recebidoEm,responsavel,origem,centroId,resultado,motivo)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(envioId, id, e.tipo, e.ocorridoEm, new Date().toISOString(),
          u.id, e.origem, e.centroId, e.resultado, e.motivo);
      if (e.comprovante) this.db.prepare('INSERT INTO comprovantes VALUES (?,?,?)').run(e.comprovante.id, envioId, e.comprovante.conteudo);
      this.db.prepare('INSERT INTO envios VALUES (?,?,?)').run(envioId, envioId, assinatura);
      return { codigo: 201, evento: this.evento(envioId) };
    });
  }
  private evento(id: string) {
    return this.db.prepare('SELECT id,tipo,ocorridoEm,recebidoEm FROM eventos WHERE id=?').get(id)!;
  }
  rastrear(id: string, u: Usuario) {
    this.exigirPerfil(u, 'cliente');
    this.encomenda(id, u);
    const eventos = this.db.prepare(
      'SELECT tipo,ocorridoEm FROM eventos WHERE encomendaId=? ORDER BY ocorridoEm,seq'
    ).all(id);
    const ultimo = eventos.at(-1);
    const status = eventos.some(e => e.tipo === 'ENTREGA') ? 'Entregue' : ultimo ? situacao[ultimo.tipo as Tipo] : 'Aguardando coleta';
    const contestacoes = this.db.prepare(
      'SELECT id,motivo,abertaEm,estado,decisao,justificativa,decididaEm FROM contestacoes WHERE encomendaId=? ORDER BY id'
    ).all(id);
    return { encomendaId: id, status, eventos, contestacoes };
  }
  investigar(id: string, u: Usuario) {
    this.exigirPerfil(u, 'suporte');
    this.encomenda(id);
    const eventos = this.db.prepare(`SELECT e.id,e.tipo,e.ocorridoEm,e.recebidoEm,e.responsavel,
      e.origem,e.centroId,e.resultado,e.motivo,p.id AS comprovanteId,p.conteudo AS comprovanteConteudo
      FROM eventos e LEFT JOIN comprovantes p ON p.eventoId=e.id
      WHERE e.encomendaId=? ORDER BY e.ocorridoEm,e.seq`).all(id);
    const contestacoes = this.db.prepare('SELECT * FROM contestacoes WHERE encomendaId=? ORDER BY id').all(id);
    return { encomendaId: id, eventos, contestacoes };
  }
  contestar(id: string, u: Usuario, corpo: unknown) {
    this.exigirPerfil(u, 'cliente');
    return this.banco.transacao(() => {
      this.encomenda(id, u);
      const motivo = texto(objeto(corpo, ['motivo']).motivo, 'motivo');
      if (!this.db.prepare("SELECT 1 FROM eventos WHERE encomendaId=? AND tipo='ENTREGA'").get(id))
        throw new ConflictException('A encomenda ainda não possui entrega registrada.');
      const novo = this.db.prepare("INSERT INTO contestacoes(encomendaId,motivo,abertaEm,estado) VALUES (?,?,?,'Aberta')")
        .run(id, motivo, new Date().toISOString());
      return this.db.prepare('SELECT * FROM contestacoes WHERE id=?').get(novo.lastInsertRowid);
    });
  }
  decidir(id: string, u: Usuario, corpo: unknown) {
    this.exigirPerfil(u, 'suporte');
    return this.banco.transacao(() => {
      const registro = this.db.prepare('SELECT estado FROM contestacoes WHERE id=?').get(id);
      if (!registro) throw new NotFoundException('Contestação indisponível.');
      if (registro.estado !== 'Aberta') throw new ConflictException('A contestação já foi decidida.');
      const dados = objeto(corpo, ['decisao', 'justificativa']);
      const decisao = texto(dados.decisao, 'decisao', 150);
      const justificativa = texto(dados.justificativa, 'justificativa');
      this.db.prepare(`UPDATE contestacoes SET estado='Decidida', decisao=?, justificativa=?, responsavel=?, decididaEm=?
        WHERE id=?`).run(decisao, justificativa, u.id, new Date().toISOString(), id);
      return this.db.prepare('SELECT * FROM contestacoes WHERE id=?').get(id);
    });
  }
}
