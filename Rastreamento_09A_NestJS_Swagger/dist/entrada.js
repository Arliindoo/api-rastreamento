"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tipos = void 0;
exports.objeto = objeto;
exports.texto = texto;
exports.identificador = identificador;
exports.lerEvento = lerEvento;
const common_1 = require("@nestjs/common");
exports.tipos = ['COLETA', 'ENTRADA', 'SAIDA', 'TENTATIVA', 'ENTREGA'];
function objeto(valor, campos) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor))
        throw new common_1.BadRequestException('Envie um objeto JSON.');
    const extra = Object.keys(valor).find(chave => !campos.includes(chave));
    if (extra)
        throw new common_1.BadRequestException('Campo inesperado: ' + extra);
    return valor;
}
function texto(valor, campo, max = 500) {
    if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max)
        throw new common_1.BadRequestException('Informe ' + campo + ' com até ' + max + ' caracteres.');
    return valor.trim();
}
function identificador(valor, campo) {
    const id = texto(valor, campo, 64);
    if (!/^[A-Za-z0-9_-]+$/.test(id))
        throw new common_1.BadRequestException(campo + ' inválido.');
    return id;
}
function instante(valor) {
    const iso = texto(valor, 'ocorridoEm', 35);
    const partes = /^(\d{4}-\d\d-\d\d)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(iso);
    const dia = partes && new Date(partes[1] + 'T00:00:00Z');
    if (!dia || !Number.isFinite(+dia) || dia.toISOString().slice(0, 10) !== partes[1] || !Number.isFinite(Date.parse(iso)))
        throw new common_1.BadRequestException('Use uma data válida com horário e fuso em ocorridoEm.');
    return new Date(iso).toISOString();
}
const extras = {
    COLETA: ['origem'], ENTRADA: ['centroId'], SAIDA: ['centroId'],
    TENTATIVA: ['resultado', 'motivo'], ENTREGA: ['comprovante'],
};
function lerEvento(valor) {
    const tipo = valor?.tipo;
    if (!tipo || !exports.tipos.includes(tipo))
        throw new common_1.BadRequestException('Tipo de evento inválido.');
    const e = objeto(valor, ['id', 'tipo', 'ocorridoEm', ...extras[tipo]]);
    const prova = tipo === 'ENTREGA' ? objeto(e.comprovante, ['id', 'conteudo']) : null;
    return {
        id: identificador(e.id, 'id'), tipo, ocorridoEm: instante(e.ocorridoEm),
        origem: tipo === 'COLETA' ? texto(e.origem, 'origem', 150) : null,
        centroId: tipo === 'ENTRADA' || tipo === 'SAIDA' ? identificador(e.centroId, 'centroId') : null,
        resultado: tipo === 'TENTATIVA' ? texto(e.resultado, 'resultado', 150) : null,
        motivo: tipo === 'TENTATIVA' ? texto(e.motivo, 'motivo') : null,
        comprovante: prova ? { id: identificador(prova.id, 'comprovante.id'), conteudo: texto(prova.conteudo, 'comprovante.conteudo', 2000) } : null,
    };
}
