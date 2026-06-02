import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Inventory } from '../../entities/inventory.entity';
import { Product } from '../../entities/product.entity';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { SalesOrder } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      Product,
      PurchaseOrder,
      PurchaseOrderItem,
      SalesOrder,
      SalesOrderItem,
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
