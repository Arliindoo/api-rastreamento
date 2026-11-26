"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RastreamentoService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const banco_1 = require("./banco");
const entrada_1 = require("./entrada");
const perfilDoEvento = {
    COLETA: 'expedicao', ENTRADA: 'centro', SAIDA: 'centro', TENTATIVA: 'motorista', ENTREGA: 'motorista',
};
const situacao = {
    COLETA: 'Coletada', ENTRADA: 'No centro', SAIDA: 'Em trânsito', TENTATIVA: 'Tentativa de entrega', ENTREGA: 'Entregue',
};
let RastreamentoService = class RastreamentoService {
    banco;
    constructor(banco) {
        this.banco = banco;
    }
    get db() { return this.banco.db; }
    exigirPerfil(u, perfil) {
        if (u.perfil !== perfil)
            throw new common_1.ForbiddenException('Perfil sem permissão para esta operação.');
    }
    encomenda(id, cliente) {
        const registro = this.db.prepare('SELECT * FROM encomendas WHERE id=?').get(id);
        if (!registro || (cliente && registro.clienteId !== cliente.id))
            throw new common_1.NotFoundException('Encomenda indisponível.');
        return registro;
    }
    registrar(id, u, corpo) {
        const e = (0, entrada_1.lerEvento)(corpo);
        this.exigirPerfil(u, perfilDoEvento[e.tipo]);
        return this.banco.transacao(() => {
            const encomenda = this.encomenda(id);
            if (u.perfil === 'motorista' && encomenda.motoristaId !== u.id)
                throw new common_1.ForbiddenException('Motorista sem vínculo com esta encomenda.');
            if (e.centroId) {
                if (!this.db.prepare('SELECT id FROM centros WHERE id=?').get(e.centroId))
                    throw new common_1.BadRequestException('Centro inexistente.');
                if (e.centroId !== u.centroId)
                    throw new common_1.ForbiddenException('Operador de outro centro.');
            }
            const { id: envioId, ...dados } = e;
            const assinatura = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify([id, u.id, dados])).digest('hex');
            const anterior = this.db.prepare('SELECT * FROM envios WHERE id=?').get(envioId);
            if (anterior) {
                if (anterior.assinatura !== assinatura)
                    throw new common_1.ConflictException('O identificador já possui outros dados.');
                return { codigo: 200, evento: this.evento(String(anterior.eventoId)) };
            }
            const prova = e.comprovante && this.db.prepare('SELECT p.eventoId, a.assinatura FROM comprovantes p JOIN envios a ON a.id=p.eventoId WHERE p.id=?').get(e.comprovante.id);
            if (prova) {
                if (prova.assinatura !== assinatura)
                    throw new common_1.ConflictException('Comprovante já vinculado com dados diferentes.');
                this.db.prepare('INSERT INTO envios VALUES (?,?,?)').run(envioId, prova.eventoId, assinatura);
                return { codigo: 200, evento: this.evento(String(prova.eventoId)) };
            }
            this.db.prepare(`INSERT INTO eventos
        (id,encomendaId,tipo,ocorridoEm,recebidoEm,responsavel,origem,centroId,resultado,motivo)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(envioId, id, e.tipo, e.ocorridoEm, new Date().toISOString(), u.id, e.origem, e.centroId, e.resultado, e.motivo);
            if (e.comprovante)
                this.db.prepare('INSERT INTO comprovantes VALUES (?,?,?)').run(e.comprovante.id, envioId, e.comprovante.conteudo);
            this.db.prepare('INSERT INTO envios VALUES (?,?,?)').run(envioId, envioId, assinatura);
            return { codigo: 201, evento: this.evento(envioId) };
        });
    }
    evento(id) {
        return this.db.prepare('SELECT id,tipo,ocorridoEm,recebidoEm FROM eventos WHERE id=?').get(id);
    }
    rastrear(id, u) {
        this.exigirPerfil(u, 'cliente');
        this.encomenda(id, u);
        const eventos = this.db.prepare('SELECT tipo,ocorridoEm FROM eventos WHERE encomendaId=? ORDER BY ocorridoEm,seq').all(id);
        const ultimo = eventos.at(-1);
        const status = eventos.some(e => e.tipo === 'ENTREGA') ? 'Entregue' : ultimo ? situacao[ultimo.tipo] : 'Aguardando coleta';
        const contestacoes = this.db.prepare('SELECT id,motivo,abertaEm,estado,decisao,justificativa,decididaEm FROM contestacoes WHERE encomendaId=? ORDER BY id').all(id);
        return { encomendaId: id, status, eventos, contestacoes };
    }
    investigar(id, u) {
        this.exigirPerfil(u, 'suporte');
        this.encomenda(id);
        const eventos = this.db.prepare(`SELECT e.id,e.tipo,e.ocorridoEm,e.recebidoEm,e.responsavel,
      e.origem,e.centroId,e.resultado,e.motivo,p.id AS comprovanteId,p.conteudo AS comprovanteConteudo
      FROM eventos e LEFT JOIN comprovantes p ON p.eventoId=e.id
      WHERE e.encomendaId=? ORDER BY e.ocorridoEm,e.seq`).all(id);
        const contestacoes = this.db.prepare('SELECT * FROM contestacoes WHERE encomendaId=? ORDER BY id').all(id);
        return { encomendaId: id, eventos, contestacoes };
    }
    contestar(id, u, corpo) {
        this.exigirPerfil(u, 'cliente');
        return this.banco.transacao(() => {
            this.encomenda(id, u);
            const motivo = (0, entrada_1.texto)((0, entrada_1.objeto)(corpo, ['motivo']).motivo, 'motivo');
            if (!this.db.prepare("SELECT 1 FROM eventos WHERE encomendaId=? AND tipo='ENTREGA'").get(id))
                throw new common_1.ConflictException('A encomenda ainda não possui entrega registrada.');
            const novo = this.db.prepare("INSERT INTO contestacoes(encomendaId,motivo,abertaEm,estado) VALUES (?,?,?,'Aberta')")
                .run(id, motivo, new Date().toISOString());
            return this.db.prepare('SELECT * FROM contestacoes WHERE id=?').get(novo.lastInsertRowid);
        });
    }
    decidir(id, u, corpo) {
        this.exigirPerfil(u, 'suporte');
        return this.banco.transacao(() => {
            const registro = this.db.prepare('SELECT estado FROM contestacoes WHERE id=?').get(id);
            if (!registro)
                throw new common_1.NotFoundException('Contestação indisponível.');
            if (registro.estado !== 'Aberta')
                throw new common_1.ConflictException('A contestação já foi decidida.');
            const dados = (0, entrada_1.objeto)(corpo, ['decisao', 'justificativa']);
            const decisao = (0, entrada_1.texto)(dados.decisao, 'decisao', 150);
            const justificativa = (0, entrada_1.texto)(dados.justificativa, 'justificativa');
            this.db.prepare(`UPDATE contestacoes SET estado='Decidida', decisao=?, justificativa=?, responsavel=?, decididaEm=?
        WHERE id=?`).run(decisao, justificativa, u.id, new Date().toISOString(), id);
            return this.db.prepare('SELECT * FROM contestacoes WHERE id=?').get(id);
        });
    }
};
exports.RastreamentoService = RastreamentoService;
exports.RastreamentoService = RastreamentoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [banco_1.Banco])
], RastreamentoService);
