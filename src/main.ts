import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Acesso } from './acesso';
import { Banco } from './banco';
import { RastreamentoController } from './rastreamento.controller';
import { RastreamentoService } from './rastreamento.service';

@Module({ controllers: [RastreamentoController], providers: [Banco, Acesso, RastreamentoService] })
class AppModule {}

async function iniciar() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(resolve('public'));
  const contrato = JSON.parse(readFileSync(resolve('public/openapi.json'), 'utf8')) as OpenAPIObject;
  SwaggerModule.setup('docs', app, contrato, {
    customSiteTitle: 'Swagger · Rastreamento de encomendas',
    jsonDocumentUrl: 'docs-json',
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
  console.log('Rastreamento disponível em ' + await app.getUrl());
}
iniciar().catch(erro => { console.error(erro); process.exitCode = 1; });
