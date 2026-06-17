import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from '../product.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';

@Controller('warehouses')
@UseGuards(AuthGuard('jwt'))
export class WarehouseController {
  constructor(private productService: ProductService) {}

  @Get()
  async findAll(@Query('all') all?: string) {
    const data = await this.productService.getWarehouses(all === 'true');
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.productService.getWarehouse(id);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: CreateWarehouseDto) {
    const data = await this.productService.createWarehouse(body);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: CreateWarehouseDto) {
    const data = await this.productService.updateWarehouse(id, body);
    return { code: 200, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.productService.deleteWarehouse(id);
    return { code: 200, message: '删除成功' };
  }
}
