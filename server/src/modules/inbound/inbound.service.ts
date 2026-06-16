import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { InboundNote } from '../../entities/inbound-note.entity';
import { InboundNoteItem } from '../../entities/inbound-note-item.entity';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';

@Injectable()
export class InboundService {
  constructor(
    @InjectRepository(InboundNote) private noteRepo: Repository<InboundNote>,
    @InjectRepository(InboundNoteItem) private itemRepo: Repository<InboundNoteItem>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
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
    const prefix = 'CGRK';
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

  /**
   * 从采购订单创建入库单
   */
  async createFromPurchaseOrder(purchaseOrder: any, operatorId: string, operatorName: string) {
    const orderNo = await this.generateOrderNo();
    let totalAmount = 0;
    let totalQuantity = 0;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const note = this.noteRepo.create({
      orderNo,
      purchaseOrderId: purchaseOrder.id,
      purchaseOrderNo: purchaseOrder.orderNo || '',
      supplierId: purchaseOrder.supplierId,
      supplierName: purchaseOrder.supplier?.name || '',
      status: 'pending',
      totalAmount: 0,
      totalQuantity: 0,
      inboundDate: dateStr,
      warehouseId: (purchaseOrder as any).warehouseId || null,
      warehouseName: (purchaseOrder as any).warehouseName || null,
      operatorId,
      operatorName,
    } as any);
    const savedNote = await this.noteRepo.save(note as any);

    const items = (purchaseOrder.items || []).map((item: any) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const amount = qty * price;
      totalAmount += amount;
      totalQuantity += qty;
      return this.itemRepo.create({
        inboundId: savedNote.id,
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        productManufacturer: item.productManufacturer,
        quantity: qty,
        price,
        amount,
        batchNo: item.batchNo || '',
        productionDate: item.productionDate || '',
        expiryDate: item.expiryDate || '',
        locationCode: item.locationCode || '',
      } as any);
    });
    await this.itemRepo.save(items);

    await this.noteRepo.update(savedNote.id, { totalAmount, totalQuantity });
    return this.findOne(savedNote.id);
  }

  async create(dto: {
    purchaseOrderId: string;
    supplierId: string;
    supplierName: string;
    items: Array<{
      productId: string;
      productName: string;
      productSpec?: string;
      productUnit?: string;
      productManufacturer?: string;
      quantity: number;
      price: number;
      batchNo: string;
      productionDate: string;
      expiryDate: string;
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

    const note = this.noteRepo.create({
      orderNo,
      purchaseOrderId: dto.purchaseOrderId,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      status: 'pending',
      totalAmount: 0,
      totalQuantity: 0,
      warehouseId: dto.warehouseId || null,
      warehouseName: dto.warehouseName || null,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      remark: dto.remark || null,
    } as any);
    const savedNote = await this.noteRepo.save(note as any);

    const items = dto.items.map((item) => {
      const amount = item.quantity * item.price;
      totalAmount += amount;
      totalQuantity += item.quantity;
      return this.itemRepo.create({
        inboundId: savedNote.id,
        ...item,
        amount,
      });
    });
    await this.itemRepo.save(items);

    await this.noteRepo.update(savedNote.id, { totalAmount, totalQuantity });
    return this.findOne(savedNote.id);
  }

  async update(id: string, dto: {
    remark?: string;
    inboundDate?: string;
    items?: Array<{
      productId: string;
      productName: string;
      productSpec?: string;
      productUnit?: string;
      productManufacturer?: string;
      quantity: number;
      price: number;
      batchNo: string;
      productionDate: string;
      expiryDate: string;
      locationCode?: string;
    }>;
  }) {
    const note = await this.noteRepo.findOne({ where: { id } });
    if (!note) throw new NotFoundException('入库单不存在');
    if (note.status !== 'pending') throw new NotFoundException('仅待审核入库单可编辑');

    if (dto.remark !== undefined) note.remark = dto.remark;
    if (dto.inboundDate !== undefined) note.inboundDate = dto.inboundDate;
    await this.noteRepo.save(note);

    if (dto.items) {
      await this.itemRepo.delete({ inboundId: id });

      let totalAmount = 0;
      let totalQuantity = 0;
      const newItems = dto.items.map((item) => {
        const qty = item.quantity;
        const price = item.price;
        const amount = qty * price;
        totalAmount += amount;
        totalQuantity += qty;
        return this.itemRepo.create({
          inboundId: id,
          productId: item.productId,
          productName: item.productName,
          productSpec: item.productSpec || null,
          productUnit: item.productUnit || null,
          productManufacturer: item.productManufacturer || null,
          quantity: qty,
          price,
          amount,
          batchNo: item.batchNo || '',
          productionDate: item.productionDate || '',
          expiryDate: item.expiryDate || '',
          locationCode: item.locationCode || null,
        } as any);
      });
      await this.itemRepo.save(newItems as any);
      note.totalAmount = totalAmount;
      note.totalQuantity = totalQuantity;
      await this.noteRepo.save(note);
    }

    return this.findOne(id);
  }

  async updateStatus(id: string, status: string, operatorId?: string, operatorName?: string) {
    const note = await this.findOne(id);
    if (!note) throw new NotFoundException('入库单不存在');

    await this.noteRepo.update(id, { status });

    // Update inventory on approval
    if (status === 'approved' && note.items) {
      for (const item of note.items) {
        const qty = parseFloat(item.quantity as any) || 0;
        let inv: any = await this.inventoryRepo.findOne({
          where: { productId: item.productId },
        });
        if (!inv) {
          inv = this.inventoryRepo.create({
            productId: item.productId,
            warehouseId: note.warehouseId || '',
            batchNo: item.batchNo || '',
            expiryDate: item.expiryDate || null,
            quantity: 0,
          } as any);
          inv = await this.inventoryRepo.save(inv as any);
        }
        const beforeQty = inv.quantity;
        inv.quantity += qty;
        await this.inventoryRepo.save(inv);
        await this.logRepo.save({
          productId: item.productId,
          productName: item.productName,
          type: 'purchase_in',
          changeQuantity: qty,
          beforeQuantity: beforeQty,
          afterQuantity: inv.quantity,
          relatedOrderId: id,
          operatorId,
          operatorName,
        });
      }
    }

    return this.findOne(id);
  }
}
