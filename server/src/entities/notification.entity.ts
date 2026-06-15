import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationStatus {
  ACTIVE = 'active',     // 未读，条件仍满足
  READ = 'read',         // 已读，条件仍满足
  RESOLVED = 'resolved', // 条件已解除（库存恢复/订单已审核）
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  type: string; // 'warn' | 'info'

  @Column({ length: 200 })
  title: string;

  @Column({ length: 500 })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ length: 20, default: 'active' })
  status: string; // 'active' | 'read' | 'resolved'

  @Column({ length: 50 })
  sourceId: string; // 关联的业务ID用于去重

  @Column({ length: 20 })
  sourceType: string; // 'low_stock' | 'purchase' | 'sales'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
