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
import { Customer } from './customer.entity';
import { SalesOrderItem } from './sales-order-item.entity';

export enum SalesOrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  orderNo: string;

  @Column()
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  totalQuantity: number;

  @Column()
  operatorId: string;

  @Column({ length: 50 })
  operatorName: string;

  @Column({ type: 'date', nullable: true })
  expectedDate: string;

  @Column({ length: 500, nullable: true })
  remark: string;

  @Column({ nullable: true })
  warehouseId: string;

  @Column({ length: 100, nullable: true })
  warehouseName: string;

  @OneToMany(() => SalesOrderItem, (item) => item.order)
  items: SalesOrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
