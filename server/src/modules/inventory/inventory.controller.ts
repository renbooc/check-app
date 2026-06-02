import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('overview')
  async getOverview() {
    const data = await this.inventoryService.getOverview();
    return { code: 200, data };
  }

  @Get()
  async getList(@Query() query: any) {
    const data = await this.inventoryService.getStockList(query);
    return { code: 200, data };
  }

  @Get('detail/:id')
  async getDetail(@Param('id') id: string) {
    const data = await this.inventoryService.getStockDetail(id);
    return { code: 200, data };
  }

  @Get('product/:productId')
  async getByProduct(@Param('productId') productId: string) {
    const data = await this.inventoryService.getStockByProductId(productId);
    return { code: 200, data };
  }
}

@Controller('stock')
@UseGuards(AuthGuard('jwt'))
export class StockController {
  constructor(private inventoryService: InventoryService) {}

  @Get('list')
  async getList(@Query() query: any) {
    const data = await this.inventoryService.getStockList(query);
    return { code: 200, data };
  }

  @Get('detail/:id')
  async getDetail(@Param('id') id: string) {
    const data = await this.inventoryService.getStockDetail(id);
    return { code: 200, data };
  }
}

@Controller('check')
@UseGuards(AuthGuard('jwt'))
export class CheckController {
  constructor(private inventoryService: InventoryService) {}

  @Post('save')
  async save(@Body() body: any, @Req() req: any) {
    const dto = {
      ...body,
      operatorId: req.user.id,
      operatorName: req.user.name,
    };
    const data = await this.inventoryService.saveCheck(dto);
    return { code: 200, message: '保存成功', data };
  }

  @Get('records')
  async getRecords(@Query() query: any) {
    const data = await this.inventoryService.getCheckRecords(query);
    return { code: 200, data };
  }

  @Get('records/:id')
  async getRecordDetail(@Param('id') id: string) {
    const data = await this.inventoryService.getCheckDetail(id);
    return { code: 200, data };
  }
}
