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
exports.Acesso = exports.Atual = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const banco_1 = require("./banco");
const derivar = (0, node_util_1.promisify)(node_crypto_1.scrypt);
exports.Atual = (0, common_1.createParamDecorator)((_valor, contexto) => contexto.switchToHttp().getRequest().usuario);
let Acesso = class Acesso {
    banco;
    constructor(banco) {
        this.banco = banco;
    }
    async canActivate(contexto) {
        const req = contexto.switchToHttp().getRequest();
        const credencial = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(req.headers.authorization || '');
        if (!credencial)
            throw new common_1.UnauthorizedException('Informe usuário e senha.');
        const texto = Buffer.from(credencial[1], 'base64').toString('utf8');
        const separador = texto.indexOf(':');
        const conta = this.banco.db.prepare('SELECT * FROM usuarios WHERE id=?').get(texto.slice(0, separador));
        const hash = await derivar(texto.slice(separador + 1), String(conta?.sal || 'conta-invalida'), 32);
        if (separador < 1 || !conta || !(0, node_crypto_1.timingSafeEqual)(Buffer.from(String(conta.hash), 'hex'), hash))
            throw new common_1.UnauthorizedException('Credenciais inválidas.');
        req.usuario = { id: String(conta.id), perfil: conta.perfil, centroId: conta.centroId };
        return true;
    }
};
exports.Acesso = Acesso;
exports.Acesso = Acesso = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [banco_1.Banco])
], Acesso);
