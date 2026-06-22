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
    if (params.locationCode) {
      // 通过批次明细表的 locationCode 反查 productId 列表，再过滤库存总表
      const details = await this.detailRepo.find({
        where: { locationCode: params.locationCode },
        select: ['productId'],
      });
      const productIds = [...new Set(details.map((d) => d.productId))];
      if (productIds.length === 0) {
        return { list: [], total: 0 };
      }
      qb.andWhere('i.productId IN (:...pids)', { pids: productIds });
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
    // 保存阶段：仅创建盘点单和明细，状态为 pending，不修改库存
    const check = this.checkRepo.create({
      checkNo,
      status: 'pending',
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

    return {
      id: savedCheck.id,
      checkNo,
      productId: dto.productId,
      productName: dto.productName,
    };
  }

  /**
   * 多批次盘点保存：一次提交多个批次的盘点结果
   * 保存阶段：仅创建盘点单和明细，状态为 pending，不修改库存
   * 审核通过后由 approveCheck 执行库存修正
   */
  async saveCheckBatch(dto: {
    productId: string;
    productName: string;
    remark?: string;
    items: {
      detailId?: string;
      batchNo: string;
      productionDate?: string;
      expiryDate?: string;
      locationCode?: string;
      stockCount: number;
      checkCount: number;
    }[];
    operatorId: string;
    operatorName: string;
  }) {
    const checkNo = `CK${Date.now()}`;
    const diffCount = dto.items.filter(i => i.checkCount !== i.stockCount).length;
    const check = this.checkRepo.create({
      checkNo,
      status: 'pending',
      totalProducts: dto.items.length,
      checkedProducts: dto.items.length,
      diffProducts: diffCount,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      remark: dto.remark,
    });
    const savedCheck = await this.checkRepo.save(check);

    for (const item of dto.items) {
      // 仅创建盘点明细，不修改 inventory_detail
      const checkItem = this.checkItemRepo.create({
        checkId: savedCheck.id,
        productId: dto.productId,
        productName: dto.productName,
        stockQuantity: item.stockCount,
        checkQuantity: item.checkCount,
        diffQuantity: item.checkCount - item.stockCount,
        locationCode: item.locationCode || '',
        batchNo: item.batchNo,
        remark: dto.remark,
      });
      await this.checkItemRepo.save(checkItem);
    }

    return {
      id: savedCheck.id,
      checkNo,
      productId: dto.productId,
      productName: dto.productName,
      itemCount: dto.items.length,
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

  /**
   * 审核盘点单：审核通过后才修正库存
   * - 逐条 item 回写 inventory_detail（已有批次更新数量，新增批次创建记录）
   * - 库存总表由批次明细之和重算
   * - 每批次写一条 inventory_log
   * - 状态流转 pending → approved
   */
  async approveCheck(id: string, operator: { id: string; name: string }) {
    const check = await this.checkRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!check) {
      throw new Error('盘点单不存在');
    }
    if (check.status !== 'pending') {
      throw new Error('只有待审核状态的盘点单才能审核');
    }

    // 按 productId 分组处理（多批次可能涉及同一商品）
    const productMap = new Map<string, typeof check.items>();
    for (const item of check.items) {
      if (!productMap.has(item.productId)) productMap.set(item.productId, []);
      productMap.get(item.productId)!.push(item);
    }

    for (const [productId, items] of productMap) {
      for (const item of items) {
        // 回写批次明细
        if (item.batchNo) {
          const detail = await this.detailRepo.findOne({
            where: { productId: item.productId, batchNo: item.batchNo },
          });
          if (detail) {
            // 已有批次：直接更新为盘点数量
            detail.quantity = item.checkQuantity;
            await this.detailRepo.save(detail);
          } else {
            // 批次明细不存在（盘到新批次）：创建
            const newDetail = this.detailRepo.create({
              productId: item.productId,
              warehouseId: '',
              batchCode: '',
              batchNo: item.batchNo,
              productionDate: null,
              expiryDate: null,
              price: 0,
              quantity: item.checkQuantity,
              pendingQuantity: 0,
              locationCode: item.locationCode || '',
            });
            await this.detailRepo.save(newDetail);
          }
        }

        // 写库存变动日志
        const log = this.logRepo.create({
          productId: item.productId,
          productName: item.productName,
          type: 'check',
          changeQuantity: item.diffQuantity,
          beforeQuantity: item.stockQuantity,
          afterQuantity: item.checkQuantity,
          relatedOrderId: check.id,
          batchNo: item.batchNo || null,
          operatorId: operator.id,
          operatorName: operator.name,
          remark: check.remark,
        });
        await this.logRepo.save(log);
      }

      // 库存总表由批次明细之和重算
      const totalQty = await this.detailRepo
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.quantity), 0)', 'total')
        .where('d.productId = :pid', { pid: productId })
        .getRawOne();
      const inventoryRecord = await this.inventoryRepo.findOne({
        where: { productId },
      });
      if (inventoryRecord) {
        inventoryRecord.quantity = parseInt(totalQty.total) || 0;
        await this.inventoryRepo.save(inventoryRecord);
      }
    }

    // 状态流转
    check.status = 'approved';
    await this.checkRepo.save(check);

    return { id, status: 'approved' };
  }

  /**
   * 撤销盘点单：仅 pending 状态可撤销（直接作废，未改库存无需回滚）
   */
  async undoCheck(id: string) {
    const check = await this.checkRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!check) {
      throw new Error('盘点单不存在');
    }
    if (check.status === 'cancelled') {
      throw new Error('该盘点单已撤销');
    }
    if (check.status === 'approved') {
      throw new Error('已审核的盘点单不可撤销');
    }

    // pending 状态未修改库存，直接标记为已撤销
    check.status = 'cancelled';
    await this.checkRepo.save(check);

    return { id, status: 'cancelled' };
  }
}
