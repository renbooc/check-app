import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InboundNoteItem } from './inbound-note-item.entity';

export enum InboundNoteStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  CANCELLED = 'cancelled',
}

@Entity('inbound_notes')
export class InboundNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  orderNo: string;

  @Column()
  purchaseOrderId: string;

  @Column({ length: 50, nullable: true })
  purchaseOrderNo: string;

  @Column()
  supplierId: string;

  @Column({ length: 100 })
  supplierName: string;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  totalQuantity: number;

  @Column({ nullable: true })
  warehouseId: string;

  @Column({ length: 100, nullable: true })
  warehouseName: string;

  @Column()
  operatorId: string;

  @Column({ length: 50 })
  operatorName: string;

  @Column({ length: 50, nullable: true })
  inboundDate: string;

  @Column({ length: 500, nullable: true })
  remark: string;

  @OneToMany(() => InboundNoteItem, (item) => item.inboundNote)
  items: InboundNoteItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
