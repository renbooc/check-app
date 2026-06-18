import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { InboundNote } from '../../entities/inbound-note.entity';
import { InboundNoteItem } from '../../entities/inbound-note-item.entity';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryDetail } from '../../entities/inventory-detail.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';

@Injectable()
export class InboundService {
  constructor(
    @InjectRepository(InboundNote) private noteRepo: Repository<InboundNote>,
    @InjectRepository(InboundNoteItem) private itemRepo: Repository<InboundNoteItem>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryLog) private logRepo: Repository<InventoryLog>,
    @InjectRepository(InventoryDetail) private detailRepo: Repository<InventoryDetail>,
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
        productionDate: item.productionDate || null,
        expiryDate: item.expiryDate || null,
        locationCode: item.locationCode || null,
      });
    });
    await this.itemRepo.save(items as any);

    await this.noteRepo.update(savedNote.id, { totalAmount, totalQuantity });
    return this.findOne(savedNote.id);
  }

  async create(dto: {
    purchaseOrderId?: string;
    supplierId?: string;
    supplierName?: string;
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
      purchaseOrderId: dto.purchaseOrderId || null,
      supplierId: dto.supplierId || null,
      supplierName: dto.supplierName || '',
      status: 'draft',
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
        productionDate: (item as any).productionDate || null,
        expiryDate: (item as any).expiryDate || null,
        batchNo: (item as any).batchNo || null,
        locationCode: (item as any).locationCode || null,
      });
    });
    await this.itemRepo.save(items as any);

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
          batchNo: item.batchNo || null,
          productionDate: item.productionDate || null,
          expiryDate: item.expiryDate || null,
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

  private assertValidTransition(currentStatus: string, targetStatus: string) {
    const ALLOWED: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['approved', 'cancelled', 'draft'],
      approved: [],
      cancelled: [],
    };
    const allowed = ALLOWED[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new NotFoundException(`不允许从「${currentStatus}」变更为「${targetStatus}」`);
    }
  }

  async updateStatus(id: string, status: string, operatorId?: string, operatorName?: string) {
    const note = await this.findOne(id);
    if (!note) throw new NotFoundException('入库单不存在');
    this.assertValidTransition(note.status, status);

    await this.noteRepo.update(id, { status });

    if (status === 'approved' && note.items) {
      const orderNo = note.orderNo;
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      await this.noteRepo.manager.transaction(async (manager) => {
        const detailRepo = manager.getRepository(InventoryDetail);
        const inventoryRepo = manager.getRepository(Inventory);
        const logRepo = manager.getRepository(InventoryLog);

        // Resolve warehouse
        let whId = note.warehouseId || '';
        if (!whId) {
          const whs = await manager.query('SELECT id FROM warehouses WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1');
          whId = (whs && whs.length > 0) ? whs[0].id : '';
        }

        for (let i = 0; i < note.items.length; i++) {
          const item = note.items[i];
          const qty = parseFloat(item.quantity as any) || 0;
          const price = parseFloat(item.price as any) || 0;
          const lineNo = String(i + 1).padStart(4, '0');
          const batchCode = `${orderNo}${lineNo}`;

          // 1. Create inventory detail (batch record)
          await detailRepo.save(detailRepo.create({
            productId: item.productId,
            warehouseId: whId,
            batchCode,
            batchNo: item.batchNo || '',
            productionDate: item.productionDate || null,
            expiryDate: item.expiryDate || null,
            price,
            quantity: qty,
            locationCode: item.locationCode || null,
          } as any));

          // 2. Update inventory summary (weighted average)
          let inv: any = await inventoryRepo.findOne({
            where: { productId: item.productId, warehouseId: whId },
          });
          if (!inv) {
            inv = inventoryRepo.create({
              productId: item.productId,
              warehouseId: whId,
              quantity: 0,
              avgPrice: 0,
              amount: 0,
            } as any);
            inv = await inventoryRepo.save(inv);
          }

          const oldQty = inv.quantity;
          const oldAmount = parseFloat(inv.amount) || 0;
          const newQty = oldQty + qty;
          const newAmount = oldAmount + (price * qty);
          const avgPrice = newQty > 0 ? newAmount / newQty : 0;

          inv.quantity = newQty;
          inv.avgPrice = avgPrice;
          inv.amount = newAmount;
          inv.latestSupplier = note.supplierName || null;
          inv.latestInboundDate = dateStr;
          await inventoryRepo.save(inv);

          // 3. Write inventory log
          await logRepo.save({
            productId: item.productId,
            productName: item.productName,
            type: 'purchase_in',
            changeQuantity: qty,
            beforeQuantity: oldQty,
            afterQuantity: newQty,
            relatedOrderId: id,
            batchCode,
            batchNo: item.batchNo || '',
            price,
            operatorId,
            operatorName,
          });
        }
      });
    }

    return this.findOne(id);
  }
}
