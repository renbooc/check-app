import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { StockCheck } from './stock-check.entity';

@Entity('stock_check_items')
export class StockCheckItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  checkId: string;

  @ManyToOne(() => StockCheck)
  @JoinColumn({ name: 'checkId' })
  check: StockCheck;

  @Column()
  productId: string;

  @Column({ length: 100 })
  productName: string;

  @Column({ length: 100, nullable: true })
  productSpec: string;

  @Column({ length: 20, nullable: true })
  productUnit: string;

  @Column({ type: 'int' })
  stockQuantity: number;

  @Column({ type: 'int' })
  checkQuantity: number;

  @Column({ type: 'int' })
  diffQuantity: number;

  @Column({ length: 50, nullable: true })
  locationCode: string;

  @Column({ length: 50, nullable: true })
  batchNo: string;

  @Column({ length: 200, nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;
}
