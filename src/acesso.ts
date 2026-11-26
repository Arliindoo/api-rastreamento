import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Request } from 'express';
import { Banco, Usuario } from './banco';

const derivar = promisify(scrypt);
type Requisicao = Request & { usuario: Usuario };
export const Atual = createParamDecorator((_valor: unknown, contexto: ExecutionContext) =>
  contexto.switchToHttp().getRequest<Requisicao>().usuario);

@Injectable()
export class Acesso implements CanActivate {
  constructor(private readonly banco: Banco) {}
  async canActivate(contexto: ExecutionContext) {
    const req = contexto.switchToHttp().getRequest<Requisicao>();
    const credencial = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(req.headers.authorization || '');
    if (!credencial) throw new UnauthorizedException('Informe usuário e senha.');
    const texto = Buffer.from(credencial[1], 'base64').toString('utf8');
    const separador = texto.indexOf(':');
    const conta = this.banco.db.prepare('SELECT * FROM usuarios WHERE id=?').get(texto.slice(0, separador));
    const hash = await derivar(texto.slice(separador + 1), String(conta?.sal || 'conta-invalida'), 32) as Buffer;
    if (separador < 1 || !conta || !timingSafeEqual(Buffer.from(String(conta.hash), 'hex'), hash))
      throw new UnauthorizedException('Credenciais inválidas.');
    req.usuario = { id: String(conta.id), perfil: conta.perfil as Usuario['perfil'], centroId: conta.centroId as string | null };
    return true;
  }
}
