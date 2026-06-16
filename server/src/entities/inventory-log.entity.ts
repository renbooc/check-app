import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('inventory_logs')
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column({ length: 100 })
  productName: string;

  @Column({ length: 20 })
  type: string;

  @Column({ type: 'int' })
  changeQuantity: number;

  @Column({ type: 'int' })
  beforeQuantity: number;

  @Column({ type: 'int' })
  afterQuantity: number;

  @Column({ nullable: true })
  relatedOrderId: string;

  @Column({ length: 50, nullable: true })
  batchCode: string;

  @Column({ length: 50, nullable: true })
  batchNo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ nullable: true })
  operatorId: string;

  @Column({ length: 50, nullable: true })
  operatorName: string;

  @Column({ length: 200, nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;
}
