import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Acesso, Atual } from './acesso';
import { Usuario } from './banco';
import { RastreamentoService } from './rastreamento.service';

@Controller()
@UseGuards(Acesso)
export class RastreamentoController {
  constructor(private readonly servico: RastreamentoService) {}
  @Post('encomendas/:id/eventos')
  registrar(@Param('id') id: string, @Atual() u: Usuario, @Body() corpo: unknown, @Res({ passthrough: true }) res: Response) {
    const { codigo, evento } = this.servico.registrar(id, u, corpo);
    res.status(codigo);
    return evento;
  }
  @Get('encomendas/:id/rastreamento')
  rastrear(@Param('id') id: string, @Atual() u: Usuario) { return this.servico.rastrear(id, u); }
  @Get('encomendas/:id/eventos')
  investigar(@Param('id') id: string, @Atual() u: Usuario) { return this.servico.investigar(id, u); }
  @Post('encomendas/:id/contestacoes')
  contestar(@Param('id') id: string, @Atual() u: Usuario, @Body() corpo: unknown) {
    return this.servico.contestar(id, u, corpo);
  }
  @Patch('contestacoes/:id')
  decidir(@Param('id') id: string, @Atual() u: Usuario, @Body() corpo: unknown) {
    return this.servico.decidir(id, u, corpo);
  }
}
