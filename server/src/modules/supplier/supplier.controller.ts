import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySupplierDto } from './dto/supplier.dto';

@Controller('suppliers')
@UseGuards(AuthGuard('jwt'))
export class SupplierController {
  constructor(private supplierService: SupplierService) {}

  @Get()
  async findAll(@Query() query: QuerySupplierDto) {
    const data = await this.supplierService.findAll(query);
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.supplierService.findOne(id);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: CreateSupplierDto) {
    const data = await this.supplierService.create(body);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateSupplierDto) {
    const data = await this.supplierService.update(id, body);
    return { code: 200, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.supplierService.remove(id);
    return { code: 200, data };
  }
}
