import {
  Controller,
  Get,
  Post,
  Body,
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
  async findAll() {
    const data = await this.productService.getWarehouses();
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: CreateWarehouseDto) {
    const data = await this.productService.createWarehouse(body);
    return { code: 200, data };
  }
}
