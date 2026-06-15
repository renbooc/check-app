import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../entities/purchase-order-item.entity';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(PurchaseOrder) private orderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem) private itemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryLog) private logRepo: Repository<InventoryLog>,
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
    });
    const savedOrder = await this.orderRepo.save(order);

    const items = dto.items.map((item) => {
      const amount = item.quantity * item.price;
      totalAmount += amount;
      totalQuantity += item.quantity;
      return this.itemRepo.create({
        orderId: savedOrder.id,
        ...item,
        amount,
      });
    });
    await this.itemRepo.save(items);

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
    }>;
    remark?: string;
    expectedDate?: string;
  }) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('采购订单不存在');

    if (dto.supplierId !== undefined) order.supplierId = dto.supplierId;
    if (dto.remark !== undefined) order.remark = dto.remark;
    if (dto.expectedDate !== undefined) order.expectedDate = dto.expectedDate;

    if (dto.items) {
      // 删除旧明细
      await this.itemRepo.delete({ orderId: id });

      let totalAmount = 0;
      let totalQuantity = 0;
      const items = dto.items.map((item) => {
        const amount = item.quantity * item.price;
        totalAmount += amount;
        totalQuantity += item.quantity;
        return this.itemRepo.create({
          orderId: id,
          ...item,
          amount,
        });
      });
      await this.itemRepo.save(items);
      order.totalAmount = totalAmount;
      order.totalQuantity = totalQuantity;
    }

    await this.orderRepo.save(order);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: string, operatorId?: string, operatorName?: string) {
    await this.orderRepo.update(id, { status });

    // 确认入库时更新库存
    if (status === 'received') {
      const order = await this.findOne(id);
      if (order && order.items) {
        for (const item of order.items) {
          const existing = await this.inventoryRepo.findOne({
            where: { productId: item.productId },
          });
          if (existing) {
            const beforeQty = existing.quantity;
            existing.quantity += item.quantity;
            await this.inventoryRepo.save(existing);
            await this.logRepo.save({
              productId: item.productId,
              productName: item.productName,
              type: 'purchase_in',
              changeQuantity: item.quantity,
              beforeQuantity: beforeQty,
              afterQuantity: existing.quantity,
              relatedOrderId: id,
              operatorId,
              operatorName,
            });
          }
        }
      }
    }
    return this.findOne(id);
  }
}
