import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from '../product.service';
import { CreateCategoryDto } from '../dto/create-category.dto';

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
  async create(@Body() body: CreateCategoryDto) {
    const data = await this.productService.createCategory(body);
    return { code: 200, data };
  }
}
