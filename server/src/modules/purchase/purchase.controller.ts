import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto, UpdatePurchaseDto, UpdatePurchaseStatusDto, QueryPurchaseDto } from './dto/purchase.dto';

@Controller('purchase')
@UseGuards(AuthGuard('jwt'))
export class PurchaseController {
  constructor(private purchaseService: PurchaseService) {}

  @Get()
  async findAll(@Query() query: QueryPurchaseDto) {
    const data = await this.purchaseService.findAll(query);
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.purchaseService.findOne(id);
    return { code: 200, data };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: CreatePurchaseDto, @Req() req: any) {
    const dto = {
      ...body,
      operatorId: req.user.id,
      operatorName: req.user.name,
    };
    const data = await this.purchaseService.create(dto);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdatePurchaseDto) {
    const data = await this.purchaseService.update(id, body);
    return { code: 200, data };
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdatePurchaseStatusDto) {
    const data = await this.purchaseService.updateStatus(id, body.status);
    return { code: 200, data };
  }
}
