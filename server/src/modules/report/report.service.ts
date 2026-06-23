import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Inventory } from '../../entities/inventory.entity';
import { Product } from '../../entities/product.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { SalesOrder, SalesOrderStatus } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';
import { Notification, NotificationStatus } from '../../entities/notification.entity';
import { InboundNote, InboundNoteStatus } from '../../entities/inbound-note.entity';
import { OutboundNote, OutboundNoteStatus } from '../../entities/outbound-note.entity';
import { StockCheck } from '../../entities/stock-check.entity';

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
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(InboundNote)
    private inboundRepo: Repository<InboundNote>,
    @InjectRepository(OutboundNote)
    private outboundRepo: Repository<OutboundNote>,
    @InjectRepository(StockCheck)
    private checkRepo: Repository<StockCheck>,
  ) {}

  /**
   * 获取概览数据（支持日期范围）
   */
  async getOverview(startDate?: string, endDate?: string) {
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate + 'T23:59:59.999') : now;

    const periodSales = await this.salesRepo
      .createQueryBuilder('so')
      .select('SUM(so.totalAmount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt >= :startDate', { startDate: start })
      .andWhere('so.createdAt <= :endDate', { endDate: end })
      .getRawOne();

    const periodPurchase = await this.purchaseRepo
      .createQueryBuilder('po')
      .select('SUM(po.totalAmount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('po.status IN (:...statuses)', {
        statuses: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.RECEIVED],
      })
      .andWhere('po.createdAt >= :startDate', { startDate: start })
      .andWhere('po.createdAt <= :endDate', { endDate: end })
      .getRawOne();

    const totalInventory = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('SUM(i.quantity)', 'total')
      .getRawOne();

    const periodOutbound = await this.salesItemRepo
      .createQueryBuilder('si')
      .innerJoin('si.order', 'so')
      .select('SUM(si.quantity)', 'total')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt >= :startDate', { startDate: start })
      .andWhere('so.createdAt <= :endDate', { endDate: end })
      .getRawOne();

    const avgInventory = (totalInventory?.total || 0) / 2;
    const turnoverRate = avgInventory > 0
      ? ((periodOutbound?.total || 0) / avgInventory).toFixed(1)
      : '0';

    return {
      totalSales: periodSales?.total || 0,
      salesCount: parseInt(periodSales?.count || '0'),
      totalPurchase: periodPurchase?.total || 0,
      purchaseCount: parseInt(periodPurchase?.count || '0'),
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
      .where('p.minQuantity > 0')
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.code')
      .addGroupBy('p.minQuantity')
      .having('SUM(i.quantity) < p.minQuantity')
      .getRawMany();

    return { list: lowStock };
  }

  /**
   * 同步通知：生成新通知 + 自动解决已失效的通知
   *
   * 生命周期: 不存在 → ACTIVE(未读) → READ(已读) → RESOLVED(已解决)
   *           ACTIVE/READ  → 条件再次满足时更新内容保持状态
   *           RESOLVED     → 条件重新出现时重新激活为 ACTIVE
   */
  private async syncNotifications() {
    // ================================================================
    // Phase 1: 遍历当前业务条件，创建或更新通知
    // ================================================================

    // ---- 低库存预警 ----
    const lowStock = await this.getLowStockProducts();
    const activeLowStockIds = (lowStock.list || []).map((item: any) => `low-stock-${item.productId}`);

    for (const item of lowStock.list || []) {
      const sourceId = `low-stock-${item.productId}`;
      const content = `${item.productName} 当前库存 ${item.quantity}，低于安全库存 ${item.minQuantity}`;
      await this.upsertNotification(sourceId, 'low_stock', 'warn', '库存预警', content);
    }

    // ---- 待审核采购单 ----
    const pendingPurchase = await this.purchaseRepo.find({
      where: { status: PurchaseOrderStatus.PENDING },
      take: 10,
    });
    const activePurchaseIds = pendingPurchase.map((o) => `purchase-${o.id}`);

    for (const order of pendingPurchase) {
      const sourceId = `purchase-${order.id}`;
      const content = `${order.orderNo} · ¥${order.totalAmount}`;
      await this.upsertNotification(sourceId, 'purchase', 'info', '采购单待审核', content);
    }

    // ---- 待审核销售单 ----
    const pendingSales = await this.salesRepo.find({
      where: { status: SalesOrderStatus.PENDING },
      take: 10,
    });
    const activeSalesIds = pendingSales.map((o) => `sales-${o.id}`);

    for (const order of pendingSales) {
      const sourceId = `sales-${order.id}`;
      const content = `${order.orderNo} · ¥${order.totalAmount}`;
      await this.upsertNotification(sourceId, 'sales', 'info', '销售单待审核', content);
    }

    // ---- 待审核入库单 ----
    const pendingInbound = await this.inboundRepo.find({
      where: { status: InboundNoteStatus.PENDING },
      take: 10,
    });
    const activeInboundIds = pendingInbound.map((o) => `inbound-${o.id}`);

    for (const note of pendingInbound) {
      const sourceId = `inbound-${note.id}`;
      const content = `${note.orderNo} · ¥${note.totalAmount}`;
      await this.upsertNotification(sourceId, 'inbound', 'info', '入库单待审核', content);
    }

    // ---- 待审核出库单 ----
    const pendingOutbound = await this.outboundRepo.find({
      where: { status: OutboundNoteStatus.PENDING },
      take: 10,
    });
    const activeOutboundIds = pendingOutbound.map((o) => `outbound-${o.id}`);

    for (const note of pendingOutbound) {
      const sourceId = `outbound-${note.id}`;
      const content = `${note.orderNo} · ¥${note.totalAmount}`;
      await this.upsertNotification(sourceId, 'outbound', 'info', '出库单待审核', content);
    }

    // ---- 待审核盘点单 ----
    const pendingChecks = await this.checkRepo.find({
      where: { status: 'pending' },
      take: 10,
    });
    const activeCheckIds = pendingChecks.map((o) => `check-${o.id}`);

    for (const check of pendingChecks) {
      const sourceId = `check-${check.id}`;
      const content = `${check.checkNo} · 共 ${check.totalProducts} 种商品`;
      await this.upsertNotification(sourceId, 'check', 'info', '盘点单待审核', content);
    }

    // ================================================================
    // Phase 2: 自动解决已失效的通知（条件不再满足）
    // ================================================================
    const allActiveSourceIds = [
      ...activeLowStockIds,
      ...activePurchaseIds,
      ...activeSalesIds,
      ...activeInboundIds,
      ...activeOutboundIds,
      ...activeCheckIds,
    ];

    // 查找所有 ACTIVE 或 READ 的通知，但当前条件下已经不存在的
    let staleNotifications: any[] = [];
    if (allActiveSourceIds.length > 0) {
      staleNotifications = await this.notificationRepo
        .createQueryBuilder('n')
        .where('n.status IN (:...statuses)', {
          statuses: [NotificationStatus.ACTIVE, NotificationStatus.READ],
        })
        .andWhere('n.sourceId NOT IN (:...ids)', { ids: allActiveSourceIds })
        .getMany();
    }

    if (staleNotifications.length > 0) {
      await this.notificationRepo.update(
        { id: In(staleNotifications.map((n) => n.id)) },
        { status: NotificationStatus.RESOLVED, updatedAt: new Date() },
      );
    }
  }

  /**
   * 创建或更新单条通知（按 sourceId + sourceType 去重）
   */
  private async upsertNotification(
    sourceId: string,
    sourceType: string,
    type: string,
    title: string,
    content: string,
  ) {
    const existing = await this.notificationRepo.findOne({
      where: { sourceId, sourceType },
      order: { createdAt: 'DESC' },
    });

    if (!existing) {
      // 全新的条件 → 创建 active 通知
      const notification = this.notificationRepo.create({
        type,
        title,
        content,
        sourceId,
        sourceType,
        status: NotificationStatus.ACTIVE,
      });
      await this.notificationRepo.save(notification);
      return;
    }

    // 通知已存在，更新内容
    // - resolved 状态的条件再次出现 → 重新激活
    // - active/read 状态 → 保持状态，更新内容和时间
    const isReappearing = existing.status === NotificationStatus.RESOLVED;
    const updateData: any = {
      content,
      title,
      type,
      status: isReappearing ? NotificationStatus.ACTIVE : existing.status,
      isRead: isReappearing ? false : existing.isRead,
      updatedAt: new Date(),
    };
    if (!isReappearing && existing.readAt) {
      updateData.readAt = existing.readAt;
    }
    await this.notificationRepo.update(existing.id, updateData);
  }

  /**
   * 获取各模块待审核数量（供首页红点使用）
   */
  async getPendingCounts() {
    const [purchaseCount, salesCount, inboundCount, outboundCount, checkCount] =
      await Promise.all([
        this.purchaseRepo.count({ where: { status: PurchaseOrderStatus.PENDING } }),
        this.salesRepo.count({ where: { status: SalesOrderStatus.PENDING } }),
        this.inboundRepo.count({ where: { status: InboundNoteStatus.PENDING } }),
        this.outboundRepo.count({ where: { status: OutboundNoteStatus.PENDING } }),
        this.checkRepo.count({ where: { status: 'pending' } }),
      ]);

    const total =
      purchaseCount + salesCount + inboundCount + outboundCount + checkCount;

    return {
      total,
      purchase: purchaseCount,
      sales: salesCount,
      inbound: inboundCount,
      outbound: outboundCount,
      check: checkCount,
    };
  }

  /**
   * 获取消息通知列表
   * @param onlyActive true=只返回未处理的通知(active) false=返回所有未解决的(active+read)
   */
  async getNotifications(onlyActive?: boolean) {
    await this.syncNotifications();

    const where: any = {};
    if (onlyActive) {
      where.status = NotificationStatus.ACTIVE;
    } else {
      where.status = In([NotificationStatus.ACTIVE, NotificationStatus.READ]);
    }

    const [list, total] = await this.notificationRepo.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    const activeCount = await this.notificationRepo.count({
      where: { status: NotificationStatus.ACTIVE },
    });

    return {
      list,
      total,
      activeCount,
    };
  }

  /**
   * 标记通知已读
   */
  async markNotificationRead(id: string) {
    const result = await this.notificationRepo.update(id, {
      isRead: true,
      readAt: new Date(),
      status: NotificationStatus.READ,
    });
    return { success: (result.affected ?? 0) > 0 };
  }

  /**
   * 全部标记已读
   */
  async markAllNotificationsRead() {
    const result = await this.notificationRepo.update(
      { status: NotificationStatus.ACTIVE },
      { status: NotificationStatus.READ, isRead: true, readAt: new Date() },
    );
    return { success: true, count: result.affected ?? 0 };
  }
}
