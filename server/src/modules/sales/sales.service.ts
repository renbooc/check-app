import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SalesOrder } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';
import { OutboundService } from '../outbound/outbound.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder) private orderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem) private itemRepo: Repository<SalesOrderItem>,
    private outboundService: OutboundService,
  ) {}

  async findAll(params: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    const { page = 1, pageSize = 20, keyword, status } = params;
    const qb = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'c')
      .loadRelationCountAndMap('o.itemsCount', 'o.items')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('o.createdAt', 'DESC');
    if (keyword) qb.andWhere('o.orderNo LIKE :kw', { kw: `%${keyword}%` });
    if (status) qb.andWhere('o.status = :status', { status });
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });
  }

  private async generateOrderNo(): Promise<string> {
    const prefix = 'XSDD';
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
    customerId: string;
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
    expectedDate?: string;
    warehouseId?: string;
    warehouseName?: string;
  }) {
    const orderNo = await this.generateOrderNo();
    let totalAmount = 0;
    let totalQuantity = 0;

    const order = this.orderRepo.create({
      orderNo,
      customerId: dto.customerId,
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
    customerId?: string;
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
    warehouseId?: string;
    warehouseName?: string;
  }) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('销售订单不存在');

    if (dto.customerId !== undefined) order.customerId = dto.customerId;
    if (dto.remark !== undefined) order.remark = dto.remark;
    if (dto.expectedDate !== undefined) order.expectedDate = dto.expectedDate;
    if (dto.warehouseId !== undefined) order.warehouseId = dto.warehouseId;
    if (dto.warehouseName !== undefined) order.warehouseName = dto.warehouseName;

    if (dto.items) {
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

  private assertValidTransition(currentStatus: string, targetStatus: string) {
    const ALLOWED: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['approved', 'cancelled'],
      approved: ['delivered'],
      delivered: [],
      cancelled: [],
    };
    const allowed = ALLOWED[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new NotFoundException(`不允许从「${currentStatus}」变更为「${targetStatus}」`);
    }
  }

  async updateStatus(id: string, status: string, operatorId?: string, operatorName?: string) {
    const order = await this.findOne(id);
    if (!order) throw new NotFoundException('销售订单不存在');
    this.assertValidTransition(order.status, status);

    await this.orderRepo.update(id, { status });

    // 确认出库 → 生成出库单（待审核），不再直接扣减库存
    if (status === 'delivered') {
      await this.outboundService.createFromSalesOrder(order, operatorId || '', operatorName || '');
    }
    return this.findOne(id);
  }
}
