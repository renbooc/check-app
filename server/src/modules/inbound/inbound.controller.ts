import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InboundService } from './inbound.service';
import { CreateInboundDto, UpdateInboundStatusDto, QueryInboundDto } from './dto/inbound.dto';

@Controller('inbound')
@UseGuards(AuthGuard('jwt'))
export class InboundController {
  constructor(private inboundService: InboundService) {}

  @Get()
  async findAll(@Query() query: QueryInboundDto) {
    const data = await this.inboundService.findAll(query);
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.inboundService.findOne(id);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: CreateInboundDto, @Req() req: any) {
    const dto = {
      ...body,
      operatorId: req.user.id,
      operatorName: req.user.name,
    };
    const data = await this.inboundService.create(dto);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { remark?: string; inboundDate?: string }) {
    const data = await this.inboundService.update(id, body);
    return { code: 200, data };
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateInboundStatusDto, @Req() req: any) {
    const data = await this.inboundService.updateStatus(id, body.status, req.user.id, req.user.name);
    return { code: 200, data };
  }
}
