import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomerService } from './customer.service';

@Controller('customers')
@UseGuards(AuthGuard('jwt'))
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @Get()
  async findAll(@Query() query: any) {
    const data = await this.customerService.findAll(query);
    return { code: 200, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.customerService.findOne(id);
    return { code: 200, data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.customerService.create(body);
    return { code: 200, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.customerService.update(id, body);
    return { code: 200, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.customerService.remove(id);
    return { code: 200, data };
  }
}
