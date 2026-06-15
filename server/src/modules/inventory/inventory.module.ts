import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { StockCheck } from '../../entities/stock-check.entity';
import { StockCheckItem } from '../../entities/stock-check-item.entity';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { SalesOrder } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';
import { Location } from '../../entities/location.entity';
import { Customer } from '../../entities/customer.entity';
import { InventoryService } from './inventory.service';
import { InventoryController, StockController, CheckController } from './inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    Inventory, InventoryLog, StockCheck, StockCheckItem,
    PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem, Location, Customer,
  ])],
  controllers: [InventoryController, StockController, CheckController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
