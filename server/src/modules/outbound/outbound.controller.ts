import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OutboundService } from './outbound.service';
import { CreateOutboundDto, UpdateOutboundStatusDto, QueryOutboundDto } from './dto/outbound.dto';

@Controller('outbound')
@UseGuards(AuthGuard('jwt'))
export class OutboundController {
  constructor(private outboundService: OutboundService) {}

  @Get()
  async findAll(@Query() query: QueryOutboundDto) {
    const data = await this.outboundService.findAll(query);
    return { code: 200, data };
  }

  @Get('last-price')
  async getLastPrice(@Query('customerId') customerId: string, @Query('productId') productId: string) {
    const data = await this.outboundService.getLastPrice(customerId, productId);
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.outboundService.findOne(id);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: CreateOutboundDto, @Req() req: any) {
    const dto = {
      ...body,
      operatorId: req.user.id,
      operatorName: req.user.name,
    };
    const data = await this.outboundService.create(dto);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: {
    remark?: string;
    outboundDate?: string;
    customerId?: string;
    customerName?: string;
    warehouseId?: string;
    warehouseName?: string;
    items?: Array<{
      productId: string;
      productName: string;
      productSpec?: string;
      productUnit?: string;
      productManufacturer?: string;
      quantity: number;
      price: number;
      batchNo?: string;
      productionDate?: string;
      expiryDate?: string;
      locationCode?: string;
    }>;
  }) {
    const data = await this.outboundService.update(id, body);
    return { code: 200, data };
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateOutboundStatusDto, @Req() req: any) {
    const data = await this.outboundService.updateStatus(id, body.status, req.user.id, req.user.name);
    return { code: 200, data };
  }
}
