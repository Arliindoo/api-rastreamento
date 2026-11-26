"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const acesso_1 = require("./acesso");
const banco_1 = require("./banco");
const rastreamento_controller_1 = require("./rastreamento.controller");
const rastreamento_service_1 = require("./rastreamento.service");
let AppModule = class AppModule {
};
AppModule = __decorate([
    (0, common_1.Module)({ controllers: [rastreamento_controller_1.RastreamentoController], providers: [banco_1.Banco, acesso_1.Acesso, rastreamento_service_1.RastreamentoService] })
], AppModule);
async function iniciar() {
    const app = await core_1.NestFactory.create(AppModule);
    app.useStaticAssets((0, node_path_1.resolve)('public'));
    const contrato = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.resolve)('public/openapi.json'), 'utf8'));
    swagger_1.SwaggerModule.setup('docs', app, contrato, {
        customSiteTitle: 'Swagger · Rastreamento de encomendas',
        jsonDocumentUrl: 'docs-json',
    });
    app.enableShutdownHooks();
    await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
    console.log('Rastreamento disponível em ' + await app.getUrl());
}
iniciar().catch(erro => { console.error(erro); process.exitCode = 1; });
