import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryDetail } from '../../entities/inventory-detail.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { StockCheck } from '../../entities/stock-check.entity';
import { StockCheckItem } from '../../entities/stock-check-item.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { SalesOrder, SalesOrderStatus } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';
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
    @InjectRepository(Location) private locationRepo: Repository<Location>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
  ) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 本月销售统计
    const monthlySales = await this.salesRepo
      .createQueryBuilder('so')
      .select('COALESCE(SUM(so.totalAmount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt >= :startDate', { startDate: startOfMonth })
      .getRawOne();

    // 本月采购统计（修复：RECEIVED 重复 -> APPROVED + RECEIVED）
    const monthlyPurchase = await this.purchaseRepo
      .createQueryBuilder('po')
      .select('COALESCE(SUM(po.totalAmount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('po.status IN (:...statuses)', {
        statuses: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.RECEIVED],
      })
      .andWhere('po.createdAt >= :startDate', { startDate: startOfMonth })
      .getRawOne();

    // 库存周转率
    const totalInventory = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.quantity), 0)', 'total')
      .getRawOne();

    const monthlyOutbound = await this.salesItemRepo
      .createQueryBuilder('si')
      .innerJoin('si.order', 'so')
      .select('COALESCE(SUM(si.quantity), 0)', 'total')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt >= :startDate', { startDate: startOfMonth })
      .getRawOne();

    // 上月销售统计（用于计算趋势）
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthSales = await this.salesRepo
      .createQueryBuilder('so')
      .select('COALESCE(SUM(so.totalAmount), 0)', 'total')
      .where('so.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.APPROVED, SalesOrderStatus.DELIVERED],
      })
      .andWhere('so.createdAt >= :startDate', { startDate: startOfLastMonth })
      .andWhere('so.createdAt < :endDate', { endDate: startOfMonth })
      .getRawOne();

    // 库存总值
    const inventoryValue = await this.inventoryRepo
      .createQueryBuilder('i')
      .innerJoin('i.product', 'p')
      .select('COALESCE(SUM(i.quantity * p.price), 0)', 'total')
      .getRawOne();

    // 商品种数
    const productCount = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('COUNT(DISTINCT i.productId)', 'count')
      .getRawOne();

    // 待盘点数
    const pendingCheckCount = await this.checkRepo
      .createQueryBuilder('sc')
      .select('COUNT(*)', 'count')
      .where('sc.status = :status', { status: 'pending' })
      .getRawOne();

    // 客户总数（修复：之前缺失该字段）
    const customerCount = await this.customerRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.isActive = true')
      .getRawOne();

    // 周转率
    const avgInventory = (parseFloat(totalInventory?.total || '0')) / 2;
    const turnoverRate = avgInventory > 0
      ? ((parseFloat(monthlyOutbound?.total || '0')) / avgInventory).toFixed(1)
      : '0';

    // 销售趋势
    const currentTotal = parseFloat(monthlySales?.total || '0');
    const lastTotal = parseFloat(lastMonthSales?.total || '0');
    const todaySalesTrend = lastTotal > 0
      ? parseFloat((((currentTotal - lastTotal) / lastTotal) * 100).toFixed(1))
      : 0;

    return {
      todaySales: currentTotal,
      todaySalesCount: parseInt(monthlySales?.count || '0'),
      todaySalesTrend,
      todayPurchase: parseFloat(monthlyPurchase?.total || '0'),
      todayPurchaseCount: parseInt(monthlyPurchase?.count || '0'),
      inventoryValue: parseFloat(inventoryValue?.total || '0'),
      productCount: parseInt(productCount?.count || '0'),
      pendingChecks: parseInt(pendingCheckCount?.count || '0'),
      pendingTypes: parseInt(pendingCheckCount?.count || '0'),
      turnoverRate,
      customerCount: parseInt(customerCount?.count || '0'), // 新增客户数
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
        where: { productId: productIds as any },
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
      ...item,
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
