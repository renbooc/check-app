import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OutboundNoteStatus } from '../../../entities/outbound-note.entity';

export class OutboundNoteItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productSpec?: string;

  @IsOptional()
  @IsString()
  productUnit?: string;

  @IsOptional()
  @IsString()
  productManufacturer?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  batchCode?: string;

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsString()
  productionDate?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  locationCode?: string;
}

export class CreateOutboundDto {
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutboundNoteItemDto)
  items: OutboundNoteItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  warehouseName?: string;
}

export class UpdateOutboundStatusDto {
  @IsEnum(OutboundNoteStatus)
  status: OutboundNoteStatus;
}

export class QueryOutboundDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
