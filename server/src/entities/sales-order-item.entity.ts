import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { Product } from './product.entity';

@Entity('sales_order_items')
export class SalesOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'orderId' })
  order: SalesOrder;

  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ length: 100 })
  productName: string;

  @Column({ length: 100, nullable: true })
  productSpec: string;

  @Column({ length: 20, nullable: true })
  productUnit: string;

  @Column({ length: 100, nullable: true })
  productManufacturer: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 50 })
  batchNo: string;

  @Column({ type: 'date' })
  productionDate: string;

  @Column({ type: 'date' })
  expiryDate: string;

  @Column({ length: 50, nullable: true })
  locationCode: string;
}
