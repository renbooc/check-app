import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Inventory } from '../../entities/inventory.entity';
import { Product } from '../../entities/product.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { SalesOrder, SalesOrderStatus } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(PurchaseOrder)
    private purchaseRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private purchaseItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(SalesOrder)
    private salesRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private salesItemRepo: Repository<SalesOrderItem>,
  ) {}

  /**
   * 获取概览数据（支持日期范围）
   */
  async getOverview(startDate?: string, endDate?: string) {
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate + 'T23:59:59') : now;

    // 本月销售统计
    const monthlySales = await this.salesRepo
      .createQueryBuilder('so')
      .select('SUM(so.totalAmount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt >= :startDate', { startDate: start })
      .getRawOne();

    // 本月采购统计
    const monthlyPurchase = await this.purchaseRepo
      .createQueryBuilder('po')
      .select('SUM(po.totalAmount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('po.status IN (:...statuses)', {
        statuses: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.RECEIVED],
      })
      .andWhere('po.createdAt >= :startDate', { startDate: start })
      .getRawOne();

    // 库存周转率（简化计算：本月出库数 / 平均库存）
    const totalInventory = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('SUM(i.quantity)', 'total')
      .getRawOne();

    const monthlyOutbound = await this.salesItemRepo
      .createQueryBuilder('si')
      .innerJoin('si.order', 'so')
      .select('SUM(si.quantity)', 'total')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt >= :startDate', { startDate: start })
      .getRawOne();

    const avgInventory = (totalInventory?.total || 0) / 2;
    const turnoverRate = avgInventory > 0
      ? ((monthlyOutbound?.total || 0) / avgInventory).toFixed(1)
      : '0';

    return {
      todaySales: monthlySales?.total || 0,
      todaySalesCount: parseInt(monthlySales?.count || '0'),
      todayPurchase: monthlyPurchase?.total || 0,
      todayPurchaseCount: parseInt(monthlyPurchase?.count || '0'),
      turnoverRate,
    };
  }

  /**
   * 获取销售排行 TOP N
   */
  async getTopProducts(limit: number = 5, startDate?: string, endDate?: string) {
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate + 'T23:59:59') : now;

    const topProducts = await this.salesItemRepo
      .createQueryBuilder('si')
      .innerJoinAndSelect('si.product', 'p')
      .innerJoin('si.order', 'so')
      .select('p.id', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('p.code', 'productCode')
      .addSelect('SUM(si.quantity)', 'totalQuantity')
      .addSelect('SUM(si.amount)', 'totalAmount')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.code')
      .orderBy('"totalAmount"', 'DESC')
      .limit(limit)
      .getRawMany();

    return { list: topProducts };
  }

  /**
   * 获取低库存预警商品
   */
  async getLowStockProducts() {
    const lowStock = await this.inventoryRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.product', 'p')
      .select('p.id', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('p.code', 'productCode')
      .addSelect('p.minQuantity', 'minQuantity')
      .addSelect('SUM(i.quantity)', 'quantity')
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.code')
      .addGroupBy('p.minQuantity')
      .having('SUM(i.quantity) < p.minQuantity')
      .getRawMany();

    return { list: lowStock };
  }

  /**
   * 获取消息通知列表（动态生成：低库存预警 + 待审核订单）
   */
  async getNotifications() {
    const notifications: any[] = [];

    // 低库存预警
    const lowStock = await this.getLowStockProducts();
    (lowStock.list || []).forEach((item: any) => {
      notifications.push({
        id: `low-stock-${item.productId}`,
        type: 'warn',
        title: '库存预警',
        content: `${item.productName} 当前库存 ${item.quantity}，低于安全库存 ${item.minQuantity}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    // 待审核采购单
    const pendingPurchase = await this.purchaseRepo.find({
      where: { status: PurchaseOrderStatus.PENDING },
      relations: ['supplier'],
      order: { createdAt: 'DESC' },
      take: 10,
    });
    pendingPurchase.forEach((order) => {
      notifications.push({
        id: `purchase-${order.id}`,
        type: 'info',
        title: '采购单待审核',
        content: `${order.orderNo} · ${(order.supplier as any)?.name || ''} · ¥${order.totalAmount}`,
        read: false,
        createdAt: order.createdAt,
      });
    });

    // 待审核销售单
    const pendingSales = await this.salesRepo.find({
      where: { status: SalesOrderStatus.PENDING },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      take: 10,
    });
    pendingSales.forEach((order) => {
      notifications.push({
        id: `sales-${order.id}`,
        type: 'info',
        title: '销售单待审核',
        content: `${order.orderNo} · ${(order.customer as any)?.name || ''} · ¥${order.totalAmount}`,
        read: false,
        createdAt: order.createdAt,
      });
    });

    // 按时间降序排列
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { list: notifications, total: notifications.length };
  }
}
