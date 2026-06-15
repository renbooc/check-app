import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from '../product.service';
import { CreateLocationDto } from '../dto/create-location.dto';

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
  async create(@Body() body: CreateLocationDto) {
    const data = await this.productService.createLocation(body);
    return { code: 200, data };
  }
}
