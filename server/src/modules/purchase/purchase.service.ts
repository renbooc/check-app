import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { InboundService } from '../inbound/inbound.service';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(PurchaseOrder) private orderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem) private itemRepo: Repository<PurchaseOrderItem>,
    private inboundService: InboundService,
  ) {}

  async findAll(params: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    const { page = 1, pageSize = 20, keyword, status } = params;
    const where: any = {};
    if (keyword) where.orderNo = Like(`%${keyword}%`);
    if (status) where.status = status;
    const [list, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['supplier'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['supplier', 'items'],
    });
  }

  private async generateOrderNo(): Promise<string> {
    const prefix = 'CGDD';
    const now = new Date();
    const dateStr = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const last = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.orderNo')
      .where("o.orderNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
      .orderBy('o.orderNo', 'DESC')
      .getRawOne();
    const seq = last ? parseInt(last.o_orderNo.slice(-4), 10) + 1 : 1;
    return `${prefix}${dateStr}${String(seq).padStart(4, '0')}`;
  }

  async create(dto: {
    supplierId: string;
    items: Array<{
      productId: string;
      productName: string;
      productSpec?: string;
      productUnit?: string;
      quantity: number;
      price: number;
      productionDate?: string;
      expiryDate?: string;
      batchNo?: string;
      locationCode?: string;
    }>;
    operatorId: string;
    operatorName: string;
    remark?: string;
  }) {
    const orderNo = await this.generateOrderNo();
    let totalAmount = 0;
    let totalQuantity = 0;

    const order = this.orderRepo.create({
      orderNo,
      supplierId: dto.supplierId,
      status: 'draft',
      totalAmount: 0,
      totalQuantity: 0,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      remark: dto.remark,
      expectedDate: (dto as any).expectedDate || null,
      warehouseId: (dto as any).warehouseId || null,
      warehouseName: (dto as any).warehouseName || null,
    });
    const savedOrder = await this.orderRepo.save(order);

    const items = dto.items.map((item) => {
      const amount = item.quantity * item.price;
      totalAmount += amount;
      totalQuantity += item.quantity;
      const entity = this.itemRepo.create();
      Object.assign(entity, {
        orderId: savedOrder.id,
        ...item,
        amount,
        productionDate: item.productionDate || null,
        expiryDate: item.expiryDate || null,
        batchNo: item.batchNo || null,
        locationCode: item.locationCode || null,
      });
      return entity;
    });
    await this.itemRepo.save(items as any);

    await this.orderRepo.update(savedOrder.id, { totalAmount, totalQuantity });
    return this.findOne(savedOrder.id);
  }

  async update(id: string, dto: {
    supplierId?: string;
    items?: Array<{
      productId: string;
      productName: string;
      productSpec?: string;
      productUnit?: string;
      quantity: number;
      price: number;
      productionDate?: string;
      expiryDate?: string;
      batchNo?: string;
      locationCode?: string;
    }>;
    remark?: string;
    expectedDate?: string;
    warehouseId?: string;
    warehouseName?: string;
  }) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('采购订单不存在');

    if (dto.supplierId !== undefined) order.supplierId = dto.supplierId;
    if (dto.remark !== undefined) order.remark = dto.remark;
    if (dto.expectedDate !== undefined) order.expectedDate = dto.expectedDate || null;
    if (dto.warehouseId !== undefined) order.warehouseId = dto.warehouseId;
    if (dto.warehouseName !== undefined) order.warehouseName = dto.warehouseName;

    if (dto.items) {
      // 删除旧明细
      await this.itemRepo.delete({ orderId: id });

      let totalAmount = 0;
      let totalQuantity = 0;
      const items = dto.items.map((item) => {
        const amount = item.quantity * item.price;
        totalAmount += amount;
        totalQuantity += item.quantity;
        const entity = this.itemRepo.create();
        Object.assign(entity, {
          orderId: id,
          ...item,
          amount,
          productionDate: item.productionDate || null,
          expiryDate: item.expiryDate || null,
          batchNo: item.batchNo || null,
          locationCode: item.locationCode || null,
        });
        return entity;
      });
      await this.itemRepo.save(items as any);
      order.totalAmount = totalAmount;
      order.totalQuantity = totalQuantity;
    }

    await this.orderRepo.save(order);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: string, operatorId?: string, operatorName?: string) {
    await this.orderRepo.update(id, { status });

    // 确认入库 → 生成入库单（待审核），不再直接改库存
    if (status === 'received') {
      const order = await this.findOne(id);
      if (order) {
        await this.inboundService.createFromPurchaseOrder(order, operatorId || '', operatorName || '');
      }
    }
    return this.findOne(id);
  }
}
