import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OutboundNote } from './outbound-note.entity';

@Entity('outbound_note_items')
export class OutboundNoteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  outboundId: string;

  @ManyToOne(() => OutboundNote)
  @JoinColumn({ name: 'outboundId' })
  outboundNote: OutboundNote;

  @Column()
  productId: string;

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

  @Column({ length: 50, nullable: true })
  batchCode: string;

  @Column({ length: 50, nullable: true })
  batchNo: string;

  @Column({ length: 50, nullable: true })
  locationCode: string;
}
