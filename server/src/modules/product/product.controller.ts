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
import { ProductService } from './product.service';

@Controller('products')
@UseGuards(AuthGuard('jwt'))
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get('search')
  async search(@Query('keyword') keyword: string) {
    const data = await this.productService.searchProducts(keyword);
    return { code: 200, data };
  }

  @Get('barcode')
  async findByBarcode(@Query('code') code: string) {
    const data = await this.productService.findByBarcode(code);
    if (!data) return { code: 404, message: '未找到该商品' };
    return { code: 200, data };
  }

  @Get()
  async findAll(@Query() query: any) {
    const data = await this.productService.findAll(query);
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.productService.findOne(id);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.productService.create(body);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.productService.update(id, body);
    return { code: 200, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.productService.remove(id);
    return { code: 200, data };
  }
}

@Controller('categories')
@UseGuards(AuthGuard('jwt'))
export class CategoryController {
  constructor(private productService: ProductService) {}

  @Get()
  async findAll() {
    const data = await this.productService.getCategories();
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.productService.createCategory(body);
    return { code: 200, data };
  }
}

@Controller('units')
@UseGuards(AuthGuard('jwt'))
export class UnitController {
  constructor(private productService: ProductService) {}

  @Get()
  async findAll() {
    const data = await this.productService.getUnits();
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.productService.createUnit(body);
    return { code: 200, data };
  }
}

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
  async create(@Body() body: any) {
    const data = await this.productService.createWarehouse(body);
    return { code: 200, data };
  }
}

@Controller('locations')
@UseGuards(AuthGuard('jwt'))
export class LocationController {
  constructor(private productService: ProductService) {}

  @Get()
  async findAll(@Query('warehouseId') warehouseId?: string) {
    const data = await this.productService.getLocations(warehouseId);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.productService.createLocation(body);
    return { code: 200, data };
  }
}
