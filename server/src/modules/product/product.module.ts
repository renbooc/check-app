import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Unit } from '../../entities/unit.entity';
import { Warehouse } from '../../entities/warehouse.entity';
import { Location } from '../../entities/location.entity';
import { ProductService } from './product.service';
import {
  ProductController,
  CategoryController,
  UnitController,
  WarehouseController,
  LocationController,
} from './product.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Unit, Warehouse, Location])],
  controllers: [ProductController, CategoryController, UnitController, WarehouseController, LocationController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
