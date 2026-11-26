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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RastreamentoController = void 0;
const common_1 = require("@nestjs/common");
const acesso_1 = require("./acesso");
const rastreamento_service_1 = require("./rastreamento.service");
let RastreamentoController = class RastreamentoController {
    servico;
    constructor(servico) {
        this.servico = servico;
    }
    registrar(id, u, corpo, res) {
        const { codigo, evento } = this.servico.registrar(id, u, corpo);
        res.status(codigo);
        return evento;
    }
    rastrear(id, u) { return this.servico.rastrear(id, u); }
    investigar(id, u) { return this.servico.investigar(id, u); }
    contestar(id, u, corpo) {
        return this.servico.contestar(id, u, corpo);
    }
    decidir(id, u, corpo) {
        return this.servico.decidir(id, u, corpo);
    }
};
exports.RastreamentoController = RastreamentoController;
__decorate([
    (0, common_1.Post)('encomendas/:id/eventos'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, acesso_1.Atual)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], RastreamentoController.prototype, "registrar", null);
__decorate([
    (0, common_1.Get)('encomendas/:id/rastreamento'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, acesso_1.Atual)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RastreamentoController.prototype, "rastrear", null);
__decorate([
    (0, common_1.Get)('encomendas/:id/eventos'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, acesso_1.Atual)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RastreamentoController.prototype, "investigar", null);
__decorate([
    (0, common_1.Post)('encomendas/:id/contestacoes'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, acesso_1.Atual)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RastreamentoController.prototype, "contestar", null);
__decorate([
    (0, common_1.Patch)('contestacoes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, acesso_1.Atual)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RastreamentoController.prototype, "decidir", null);
exports.RastreamentoController = RastreamentoController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(acesso_1.Acesso),
    __metadata("design:paramtypes", [rastreamento_service_1.RastreamentoService])
], RastreamentoController);
