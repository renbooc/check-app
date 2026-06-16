import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundNote } from '../../entities/outbound-note.entity';
import { OutboundNoteItem } from '../../entities/outbound-note-item.entity';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryDetail } from '../../entities/inventory-detail.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { OutboundService } from './outbound.service';
import { OutboundController } from './outbound.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundNote, OutboundNoteItem, Inventory, InventoryDetail, InventoryLog])],
  controllers: [OutboundController],
  providers: [OutboundService],
  exports: [OutboundService],
})
export class OutboundModule {}
