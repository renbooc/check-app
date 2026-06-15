import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true, nullable: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 200, nullable: true })
  address: string;

  @Column({ length: 50, nullable: true })
  contactPerson: string;

  @Column({ length: 500, nullable: true })
  remark: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
