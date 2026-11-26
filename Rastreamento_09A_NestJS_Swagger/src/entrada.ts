import { BadRequestException } from '@nestjs/common';

export const tipos = ['COLETA', 'ENTRADA', 'SAIDA', 'TENTATIVA', 'ENTREGA'] as const;
export type Tipo = typeof tipos[number];

export function objeto(valor: unknown, campos: string[]): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor))
    throw new BadRequestException('Envie um objeto JSON.');
  const extra = Object.keys(valor).find(chave => !campos.includes(chave));
  if (extra) throw new BadRequestException('Campo inesperado: ' + extra);
  return valor as Record<string, unknown>;
}
export function texto(valor: unknown, campo: string, max = 500): string {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max)
    throw new BadRequestException('Informe ' + campo + ' com até ' + max + ' caracteres.');
  return valor.trim();
}
export function identificador(valor: unknown, campo: string) {
  const id = texto(valor, campo, 64);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new BadRequestException(campo + ' inválido.');
  return id;
}
function instante(valor: unknown) {
  const iso = texto(valor, 'ocorridoEm', 35);
  const partes = /^(\d{4}-\d\d-\d\d)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(iso);
  const dia = partes && new Date(partes[1] + 'T00:00:00Z');
  if (!dia || !Number.isFinite(+dia) || dia.toISOString().slice(0, 10) !== partes![1] || !Number.isFinite(Date.parse(iso)))
    throw new BadRequestException('Use uma data válida com horário e fuso em ocorridoEm.');
  return new Date(iso).toISOString();
}
const extras: Record<Tipo, string[]> = {
  COLETA: ['origem'], ENTRADA: ['centroId'], SAIDA: ['centroId'],
  TENTATIVA: ['resultado', 'motivo'], ENTREGA: ['comprovante'],
};
export function lerEvento(valor: unknown) {
  const tipo = (valor as {tipo?: Tipo} | null)?.tipo;
  if (!tipo || !tipos.includes(tipo)) throw new BadRequestException('Tipo de evento inválido.');
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
