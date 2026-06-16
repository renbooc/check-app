import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboundNote } from '../../entities/inbound-note.entity';
import { InboundNoteItem } from '../../entities/inbound-note-item.entity';
import { Inventory } from '../../entities/inventory.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InboundNote, InboundNoteItem, Inventory, InventoryLog])],
  controllers: [InboundController],
  providers: [InboundService],
  exports: [InboundService],
})
export class InboundModule {}
