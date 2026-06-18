import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OutboundNoteItem } from './outbound-note-item.entity';

export enum OutboundNoteStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  CANCELLED = 'cancelled',
}

@Entity('outbound_notes')
export class OutboundNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  orderNo: string;

  @Column({ nullable: true })
  salesOrderId: string;

  @Column({ length: 50, nullable: true })
  salesOrderNo: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ length: 100, nullable: true })
  customerName: string;

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
  outboundDate: string;

  @Column({ length: 500, nullable: true })
  remark: string;

  @OneToMany(() => OutboundNoteItem, (item) => item.outboundNote)
  items: OutboundNoteItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
