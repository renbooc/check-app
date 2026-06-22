import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { QueryInventoryDto, SaveCheckDto, SaveCheckBatchDto, QueryCheckRecordDto } from './dto/inventory.dto';

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
  async getList(@Query() query: QueryInventoryDto) {
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
  async getList(@Query() query: QueryInventoryDto) {
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
  @HttpCode(HttpStatus.OK)
  async save(@Body() body: SaveCheckDto, @Req() req: any) {
    const dto = {
      ...body,
      location: body.location || '',
      batchNo: body.batchNo || '',
      remark: body.remark || '',
      operatorId: req.user.id,
      operatorName: req.user.name,
    };
    const data = await this.inventoryService.saveCheck(dto);
    return { code: 200, message: '保存成功', data };
  }

  @Post('save-batch')
  @HttpCode(HttpStatus.OK)
  async saveBatch(@Body() body: SaveCheckBatchDto, @Req() req: any) {
    const dto = {
      ...body,
      operatorId: req.user.id,
      operatorName: req.user.name,
    };
    const data = await this.inventoryService.saveCheckBatch(dto);
    return { code: 200, message: '保存成功', data };
  }

  @Get('records')
  async getRecords(@Query() query: QueryCheckRecordDto) {
    const data = await this.inventoryService.getCheckRecords(query);
    return { code: 200, data };
  }

  @Get('records/:id')
  async getRecordDetail(@Param('id') id: string) {
    const data = await this.inventoryService.getCheckDetail(id);
    return { code: 200, data };
  }

  @Delete(':id')
  async undo(@Param('id') id: string) {
    const data = await this.inventoryService.undoCheck(id);
    return { code: 200, message: '撤销成功', data };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @Req() req: any) {
    const data = await this.inventoryService.approveCheck(id, {
      id: req.user.id,
      name: req.user.name,
    });
    return { code: 200, message: '审核成功', data };
  }
}
