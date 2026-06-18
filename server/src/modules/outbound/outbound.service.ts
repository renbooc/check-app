import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { OutboundNote } from '../../entities/outbound-note.entity';
import { OutboundNoteItem } from '../../entities/outbound-note-item.entity';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryDetail } from '../../entities/inventory-detail.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';

@Injectable()
export class OutboundService {
  constructor(
    @InjectRepository(OutboundNote) private noteRepo: Repository<OutboundNote>,
    @InjectRepository(OutboundNoteItem) private itemRepo: Repository<OutboundNoteItem>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryDetail) private detailRepo: Repository<InventoryDetail>,
    @InjectRepository(InventoryLog) private logRepo: Repository<InventoryLog>,
  ) {}

  async findAll(params: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    const { page = 1, pageSize = 20, keyword, status } = params;
    const where: any = {};
    if (keyword) where.orderNo = Like(`%${keyword}%`);
    if (status) where.status = status;
    const [list, total] = await this.noteRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    return this.noteRepo.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  private async generateOrderNo(): Promise<string> {
    const prefix = 'XSCK';
    const now = new Date();
    const dateStr = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const last = await this.noteRepo
      .createQueryBuilder('n')
      .select('n.orderNo')
      .where("n.orderNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
      .orderBy('n.orderNo', 'DESC')
      .getRawOne();
    const seq = last ? parseInt(last.n_orderNo.slice(-4), 10) + 1 : 1;
    return `${prefix}${dateStr}${String(seq).padStart(4, '0')}`;
  }

  async createFromSalesOrder(salesOrder: any, operatorId: string, operatorName: string) {
    const orderNo = await this.generateOrderNo();
    let totalAmount = 0;
    let totalQuantity = 0;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const whId = (salesOrder as any).warehouseId || '';

    const note = this.noteRepo.create({
      orderNo,
      salesOrderId: salesOrder.id,
      salesOrderNo: salesOrder.orderNo || '',
      customerId: salesOrder.customerId,
      customerName: salesOrder.customer?.name || '',
      status: 'pending',
      totalAmount: 0,
      totalQuantity: 0,
      outboundDate: dateStr,
      warehouseId: whId || null,
      warehouseName: (salesOrder as any).warehouseName || null,
      operatorId,
      operatorName,
    } as any);
    const savedNote = await this.noteRepo.save(note as any);

    // Build outbound items by allocating batches via FEFO (近效期先出)
    const outboundItems: any[] = [];
    for (const item of (salesOrder.items || [])) {
      const needQty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      if (needQty <= 0) continue;

      // 按有效期 ASC → 生产日期 ASC 排序：近效期先出、同效期先产先出
      const whId = salesOrder.warehouseId || (salesOrder as any).warehouseId || '';
      const batchWhere: any = { productId: item.productId };
      if (whId) batchWhere.warehouseId = whId;
      const batches = await this.detailRepo.find({
        where: batchWhere,
        order: { expiryDate: 'ASC', productionDate: 'ASC', createdAt: 'ASC' },
      });

      let remaining = needQty;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const avail = batch.quantity;
        if (avail <= 0) continue;

        const deduct = Math.min(avail, remaining);
        const amount = deduct * price;
        totalAmount += amount;
        totalQuantity += deduct;

        outboundItems.push(this.itemRepo.create({
          outboundId: savedNote.id,
          productId: item.productId,
          productName: item.productName,
          productSpec: item.productSpec,
          productUnit: item.productUnit,
          productManufacturer: item.productManufacturer,
          quantity: deduct,
          price,
          amount,
          batchCode: batch.batchCode,
          batchNo: batch.batchNo,
          productionDate: batch.productionDate,
          expiryDate: batch.expiryDate,
          locationCode: batch.locationCode || null,
        } as any));

        remaining -= deduct;
      }

      // 如果库存不足，剩余量仍创建出库明细（无批次分配）
      if (remaining > 0) {
        const amount = remaining * price;
        totalAmount += amount;
        totalQuantity += remaining;
        outboundItems.push(this.itemRepo.create({
          outboundId: savedNote.id,
          productId: item.productId,
          productName: item.productName,
          productSpec: item.productSpec,
          productUnit: item.productUnit,
          productManufacturer: item.productManufacturer,
          quantity: remaining,
          price,
          amount,
        } as any));
      }
    }

    await this.itemRepo.save(outboundItems as any);
    await this.noteRepo.update(savedNote.id, { totalAmount, totalQuantity });
    return this.findOne(savedNote.id);
  }

  async create(dto: {
    salesOrderId?: string;
    customerId?: string;
    customerName?: string;
    items: Array<{
      productId: string;
      productName: string;
      productSpec?: string;
      productUnit?: string;
      productManufacturer?: string;
      quantity: number;
      price: number;
      batchNo?: string;
      locationCode?: string;
    }>;
    operatorId: string;
    operatorName: string;
    remark?: string;
    warehouseId?: string;
    warehouseName?: string;
  }) {
    const orderNo = await this.generateOrderNo();
    let totalAmount = 0;
    let totalQuantity = 0;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const note = this.noteRepo.create({
      orderNo,
      salesOrderId: dto.salesOrderId || null,
      customerId: dto.customerId || null,
      customerName: dto.customerName || '',
      status: 'pending',
      totalAmount: 0,
      totalQuantity: 0,
      outboundDate: dateStr,
      warehouseId: dto.warehouseId || null,
      warehouseName: dto.warehouseName || null,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      remark: dto.remark || null,
    } as any);
    const savedNote = await this.noteRepo.save(note as any);

    const items = dto.items.map((item) => {
      const qty = item.quantity;
      const price = item.price;
      const amount = qty * price;
      totalAmount += amount;
      totalQuantity += qty;
      return this.itemRepo.create({
        outboundId: savedNote.id,
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec || null,
        productUnit: item.productUnit || null,
        productManufacturer: item.productManufacturer || null,
        quantity: qty,
        price,
        amount,
        batchNo: item.batchNo || '',
        locationCode: item.locationCode || null,
      } as any);
    });
    await this.itemRepo.save(items as any);

    await this.noteRepo.update(savedNote.id, { totalAmount, totalQuantity });
    return this.findOne(savedNote.id);
  }

  async update(id: string, dto: {
    remark?: string;
    outboundDate?: string;
    items?: Array<{
      productId: string;
      productName: string;
      productSpec?: string;
      productUnit?: string;
      productManufacturer?: string;
      quantity: number;
      price: number;
      batchNo?: string;
      productionDate?: string;
      expiryDate?: string;
      locationCode?: string;
    }>;
  }) {
    const note = await this.noteRepo.findOne({ where: { id } });
    if (!note) throw new NotFoundException('出库单不存在');
    if (note.status !== 'pending') throw new NotFoundException('仅待审核出库单可编辑');

    if (dto.remark !== undefined) note.remark = dto.remark;
    if (dto.outboundDate !== undefined) note.outboundDate = dto.outboundDate;
    await this.noteRepo.save(note);

    if (dto.items) {
      await this.itemRepo.delete({ outboundId: id });

      let totalAmount = 0;
      let totalQuantity = 0;
      const items = dto.items.map((item) => {
        const qty = item.quantity;
        const price = item.price;
        const amount = qty * price;
        totalAmount += amount;
        totalQuantity += qty;
        return this.itemRepo.create({
          outboundId: id,
          productId: item.productId,
          productName: item.productName,
          productSpec: item.productSpec || null,
          productUnit: item.productUnit || null,
          productManufacturer: item.productManufacturer || null,
          quantity: qty,
          price,
          amount,
          batchNo: item.batchNo || null,
          productionDate: item.productionDate || null,
          expiryDate: item.expiryDate || null,
          locationCode: item.locationCode || null,
        } as any);
      });
      await this.itemRepo.save(items as any);
      note.totalAmount = totalAmount;
      note.totalQuantity = totalQuantity;
      await this.noteRepo.save(note);
    }

    return this.findOne(id);
  }

  async updateStatus(id: string, status: string, operatorId?: string, operatorName?: string) {
    const note = await this.findOne(id);
    if (!note) throw new NotFoundException('出库单不存在');

    await this.noteRepo.update(id, { status });

    if (status === 'approved' && note.items) {
      // FEFO 扣减库存：近效期先出
      for (const item of note.items) {
        const needQty = Math.abs(parseFloat(item.quantity as any) || 0);
        if (needQty <= 0) continue;

        const batchWhere: any = { productId: item.productId };
        if (note.warehouseId) batchWhere.warehouseId = note.warehouseId;
        const batches = await this.detailRepo.find({
          where: batchWhere,
          order: { expiryDate: 'ASC', productionDate: 'ASC', createdAt: 'ASC' },
        });

        let remaining = needQty;
        let totalDeducted = 0;
        let totalAmount = 0;

        for (const batch of batches) {
          if (remaining <= 0) break;
          const avail = batch.quantity;
          if (avail <= 0) continue;

          const deduct = Math.min(avail, remaining);
          batch.quantity -= deduct;
          remaining -= deduct;
          totalDeducted += deduct;
          totalAmount += deduct * batch.price;
          await this.detailRepo.save(batch);

          await this.logRepo.save({
            productId: item.productId,
            productName: item.productName,
            type: 'sales_out',
            changeQuantity: -deduct,
            beforeQuantity: avail,
            afterQuantity: batch.quantity,
            relatedOrderId: id,
            batchCode: batch.batchCode,
            batchNo: batch.batchNo,
            price: batch.price,
            operatorId,
            operatorName,
          });
        }

        // Update inventory summary
        const inv = await this.inventoryRepo.findOne({
          where: { productId: item.productId },
        });
        if (inv) {
          inv.quantity = Math.max(0, inv.quantity - needQty);
          if (inv.quantity === 0) { inv.avgPrice = 0; inv.amount = 0; }
          await this.inventoryRepo.save(inv);
        }
      }
    }

    return this.findOne(id);
  }

  async getLastPrice(customerId: string, productId: string): Promise<number> {
    const item = await this.itemRepo
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.outboundNote', 'note')
      .where('item.productId = :productId', { productId })
      .andWhere('note.customerId = :customerId', { customerId })
      .orderBy('item.createdAt', 'DESC')
      .getOne();
    return item ? item.price : 0;
  }
}
