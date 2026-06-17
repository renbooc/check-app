import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { InventoryDetail } from '../../entities/inventory-detail.entity';
import { StockCheck } from '../../entities/stock-check.entity';
import { StockCheckItem } from '../../entities/stock-check-item.entity';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { SalesOrder } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';
import { OutboundNote } from '../../entities/outbound-note.entity';
import { InboundNote } from '../../entities/inbound-note.entity';
import { Location } from '../../entities/location.entity';
import { Customer } from '../../entities/customer.entity';
import { Product } from '../../entities/product.entity';
import { InventoryService } from './inventory.service';
import { InventoryController, StockController, CheckController } from './inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    Inventory, InventoryDetail, InventoryLog, StockCheck, StockCheckItem,
    PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem,
    OutboundNote, InboundNote, Product, Location, Customer,
  ])],
  controllers: [InventoryController, StockController, CheckController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
