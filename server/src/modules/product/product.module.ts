import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Unit } from '../../entities/unit.entity';
import { Warehouse } from '../../entities/warehouse.entity';
import { Location } from '../../entities/location.entity';
import { InventoryDetail } from '../../entities/inventory-detail.entity';
import { ProductService } from './product.service';
import { ProductController } from './controllers/product.controller';
import { CategoryController } from './controllers/category.controller';
import { UnitController } from './controllers/unit.controller';
import { WarehouseController } from './controllers/warehouse.controller';
import { LocationController } from './controllers/location.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Unit, Warehouse, Location, InventoryDetail])],
  controllers: [ProductController, CategoryController, UnitController, WarehouseController, LocationController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
