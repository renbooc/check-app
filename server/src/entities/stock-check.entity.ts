import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { StockCheckItem } from './stock-check-item.entity';

@Entity('stock_checks')
export class StockCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  checkNo: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ nullable: true })
  warehouseId: string;

  @Column({ nullable: true })
  locationId: string;

  @Column({ type: 'int', default: 0 })
  totalProducts: number;

  @Column({ type: 'int', default: 0 })
  checkedProducts: number;

  @Column({ type: 'int', default: 0 })
  diffProducts: number;

  @Column()
  operatorId: string;

  @Column({ length: 50 })
  operatorName: string;

  @Column({ length: 500, nullable: true })
  remark: string;

  @OneToMany(() => StockCheckItem, (item) => item.check)
  items: StockCheckItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
