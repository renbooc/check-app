import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryDetail } from '../../entities/inventory-detail.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { StockCheck } from '../../entities/stock-check.entity';
import { StockCheckItem } from '../../entities/stock-check-item.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { SalesOrder, SalesOrderStatus } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';
import { OutboundNote } from '../../entities/outbound-note.entity';
import { InboundNote } from '../../entities/inbound-note.entity';
import { Product } from '../../entities/product.entity';
import { Location } from '../../entities/location.entity';
import { Customer } from '../../entities/customer.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryDetail) private detailRepo: Repository<InventoryDetail>,
    @InjectRepository(InventoryLog) private logRepo: Repository<InventoryLog>,
    @InjectRepository(StockCheck) private checkRepo: Repository<StockCheck>,
    @InjectRepository(StockCheckItem) private checkItemRepo: Repository<StockCheckItem>,
    @InjectRepository(PurchaseOrder) private purchaseRepo: Repository<PurchaseOrder>,
    @InjectRepository(SalesOrder) private salesRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem) private salesItemRepo: Repository<SalesOrderItem>,
    @InjectRepository(OutboundNote) private outboundRepo: Repository<OutboundNote>,
    @InjectRepository(InboundNote) private inboundRepo: Repository<InboundNote>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Location) private locationRepo: Repository<Location>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
  ) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // 今日时间范围
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    // ===== 今日销售（已审核出库单） =====
    const todaySales = await this.outboundRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('o.status = :status', { status: 'approved' })
      .andWhere('o.createdAt >= :startDate', { startDate: todayStart })
      .andWhere('o.createdAt < :endDate', { endDate: todayEnd })
      .getRawOne();

    // ===== 今日采购（已审核入库单） =====
    const todayPurchase = await this.inboundRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.totalAmount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('i.status = :status', { status: 'approved' })
      .andWhere('i.createdAt >= :startDate', { startDate: todayStart })
      .andWhere('i.createdAt < :endDate', { endDate: todayEnd })
      .getRawOne();

    // ===== 本月销售（已审核出库单） =====
    const monthSales = await this.outboundRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('o.status = :status', { status: 'approved' })
      .andWhere('o.createdAt >= :startDate', { startDate: startOfMonth })
      .getRawOne();

    // 上月销售（出库单，用于趋势对比）
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthSales = await this.outboundRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .where('o.status = :status', { status: 'approved' })
      .andWhere('o.createdAt >= :startDate', { startDate: startOfLastMonth })
      .andWhere('o.createdAt < :endDate', { endDate: startOfMonth })
      .getRawOne();

    // ===== 库存总值（按入库成本价计算） =====
    const inventoryValue = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.amount), 0)', 'total')
      .getRawOne();

    // ===== 商品种数（从 products 表统计所有商品，含库存为0的） =====
    const productCount = await this.productRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'count')
      .where('p.status != :void', { void: 'void' })
      .andWhere('p.isActive = true')
      .getRawOne();

    // ===== 待盘点数 =====
    const pendingCheckCount = await this.checkRepo
      .createQueryBuilder('sc')
      .select('COUNT(*)', 'count')
      .where('sc.status = :status', { status: 'pending' })
      .getRawOne();

    // ===== 客户总数 =====
    const customerCount = await this.customerRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.isActive = true')
      .getRawOne();

    // ===== 销售额趋势 =====
    const currentMonthTotal = parseFloat(monthSales?.total || '0');
    const lastTotal = parseFloat(lastMonthSales?.total || '0');
    const salesTrend = lastTotal > 0
      ? parseFloat((((currentMonthTotal - lastTotal) / lastTotal) * 100).toFixed(1))
      : 0;

    return {
      // 今日数据
      todaySales: parseFloat(todaySales?.total || '0'),
      todaySalesCount: parseInt(todaySales?.count || '0'),
      todayPurchase: parseFloat(todayPurchase?.total || '0'),
      todayPurchaseCount: parseInt(todayPurchase?.count || '0'),
      // 本月数据
      monthSales: parseFloat(monthSales?.total || '0'),
      monthSalesCount: parseInt(monthSales?.count || '0'),
      // 趋势（本月 vs 上月）
      salesTrend,
      // 库存
      inventoryValue: parseFloat(inventoryValue?.total || '0'),
      productCount: parseInt(productCount?.count || '0'),
      pendingChecks: parseInt(pendingCheckCount?.count || '0'),
      customerCount: parseInt(customerCount?.count || '0'),
    };
  }

  async getStockList(params: { keyword?: string; warehouseId?: string; locationId?: string }) {
    const qb = this.inventoryRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.product', 'p')
      .leftJoinAndSelect('p.unit', 'u')
      .leftJoinAndSelect('i.warehouse', 'w');

    if (params.keyword) {
      qb.andWhere('(p.name LIKE :kw OR p.code LIKE :kw)', { kw: `%${params.keyword}%` });
    }
    if (params.warehouseId) {
      qb.andWhere('i.warehouseId = :wid', { wid: params.warehouseId });
    }

    const list = await qb.orderBy('i.updatedAt', 'DESC').getMany();

    // 加载每个库存的批次明细
    const productIds = list.map(item => item.productId);
    let batches: InventoryDetail[] = [];
    if (productIds.length > 0) {
      batches = await this.detailRepo.find({
        where: { productId: In(productIds) },
        order: { createdAt: 'DESC' },
      });
    }
    const batchMap = new Map<string, InventoryDetail[]>();
    for (const b of batches) {
      const key = b.productId;
      if (!batchMap.has(key)) batchMap.set(key, []);
      batchMap.get(key)!.push(b);
    }

    const resultList = list.map(item => ({
      id: item.id,
      productId: item.productId,
      product: item.product,
      warehouseId: item.warehouseId,
      warehouse: item.warehouse,
      quantity: item.quantity,
      avgPrice: item.avgPrice,
      amount: item.amount,
      latestSupplier: item.latestSupplier,
      latestInboundDate: item.latestInboundDate,
      batches: batchMap.get(item.productId) || [],
    }));

    return { list: resultList, total: resultList.length };
  }

  async getStockDetail(id: string) {
    const inventory = await this.inventoryRepo.findOne({
      where: { id },
      relations: ['product', 'warehouse'],
    });
    if (!inventory) return null;
    const logs = await this.logRepo.find({
      where: { productId: inventory.productId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return { inventory, logs };
  }

  async getStockByProductId(productId: string) {
    const inventories = await this.inventoryRepo.find({
      where: { productId },
      relations: ['product', 'warehouse'],
    });
    if (!inventories || inventories.length === 0) return null;

    // 汇总所有仓位的库存
    const totalQuantity = inventories.reduce((sum, i) => sum + i.quantity, 0);
    const logs = await this.logRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const batches = await this.detailRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      inventory: {
        ...inventories[0],
        quantity: totalQuantity,
        warehouses: inventories.map(i => ({
          warehouse: i.warehouse,
          quantity: i.quantity,
        })),
      },
      batches,
      logs,
    };
  }

  async saveCheck(dto: {
    productId: string;
    productName: string;
    checkCount: number;
    stockCount: number;
    location: string;
    batchNo: string;
    remark: string;
    operatorId: string;
    operatorName: string;
  }) {
    const checkNo = `CK${Date.now()}`;
    const check = this.checkRepo.create({
      checkNo,
      status: 'completed',
      totalProducts: 1,
      checkedProducts: 1,
      diffProducts: dto.checkCount !== dto.stockCount ? 1 : 0,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      remark: dto.remark,
    });
    const savedCheck = await this.checkRepo.save(check);

    const item = this.checkItemRepo.create({
      checkId: savedCheck.id,
      productId: dto.productId,
      productName: dto.productName,
      stockQuantity: dto.stockCount,
      checkQuantity: dto.checkCount,
      diffQuantity: dto.checkCount - dto.stockCount,
      locationCode: dto.location,
      batchNo: dto.batchNo,
      remark: dto.remark,
    });
    await this.checkItemRepo.save(item);

    // 同步更新库存总表
    const inventoryRecord = await this.inventoryRepo.findOne({
      where: { productId: dto.productId },
    });
    if (inventoryRecord) {
      inventoryRecord.quantity = dto.checkCount;
      await this.inventoryRepo.save(inventoryRecord);
    }

    const log = this.logRepo.create({
      productId: dto.productId,
      productName: dto.productName,
      type: 'check',
      changeQuantity: dto.checkCount - dto.stockCount,
      beforeQuantity: dto.stockCount,
      afterQuantity: dto.checkCount,
      relatedOrderId: savedCheck.id,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      remark: dto.remark,
    });
    await this.logRepo.save(log);

    return {
      id: savedCheck.id,
      checkNo,
      productId: dto.productId,
      productName: dto.productName,
    };
  }

  async getCheckRecords(params: { page?: number; pageSize?: number; keyword?: string }) {
    const { page = 1, pageSize = 20, keyword } = params;
    const qb = this.checkRepo.createQueryBuilder('sc').leftJoinAndSelect('sc.items', 'items');

    if (keyword) {
      qb.andWhere('sc.checkNo LIKE :kw', { kw: `%${keyword}%` });
    }

    const [list, total] = await qb
      .orderBy('sc.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async getCheckDetail(id: string) {
    return this.checkRepo.findOne({
      where: { id },
      relations: ['items'],
    });
  }
}
