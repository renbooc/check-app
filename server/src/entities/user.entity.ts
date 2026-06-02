import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ length: 100, select: false })
  password: string;

  @Column({ length: 50 })
  role: string;

  @Column({ length: 200, nullable: true })
  avatar: string;

  @Column({ length: 50, nullable: true })
  storeId: string;

  @Column({ length: 100, nullable: true })
  storeName: string;

  @Column({ length: 50, nullable: true })
  openid: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
