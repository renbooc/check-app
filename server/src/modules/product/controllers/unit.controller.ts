import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from '../product.service';
import { CreateUnitDto } from '../dto/create-unit.dto';

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
  async create(@Body() body: CreateUnitDto) {
    const data = await this.productService.createUnit(body);
    return { code: 200, data };
  }
}
