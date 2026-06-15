import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalesService } from './sales.service';
import { CreateSalesDto, UpdateSalesDto, UpdateSalesStatusDto, QuerySalesDto } from './dto/sales.dto';

@Controller('sales')
@UseGuards(AuthGuard('jwt'))
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  async findAll(@Query() query: QuerySalesDto) {
    const data = await this.salesService.findAll(query);
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.salesService.findOne(id);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: CreateSalesDto, @Req() req: any) {
    const dto = {
      ...body,
      operatorId: req.user.id,
      operatorName: req.user.name,
    };
    const data = await this.salesService.create(dto);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateSalesDto) {
    const data = await this.salesService.update(id, body);
    return { code: 200, data };
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateSalesStatusDto) {
    const data = await this.salesService.updateStatus(id, body.status);
    return { code: 200, data };
  }
}
