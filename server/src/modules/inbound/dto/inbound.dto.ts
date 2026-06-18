import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { InboundNoteStatus } from '../../../entities/inbound-note.entity';

export class InboundNoteItemDto {
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

  @IsString()
  batchNo: string;

  @IsString()
  productionDate: string;

  @IsString()
  expiryDate: string;

  @IsOptional()
  @IsString()
  locationCode?: string;
}

export class CreateInboundDto {
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InboundNoteItemDto)
  items: InboundNoteItemDto[];

  @IsOptional()
  @IsString()
  inboundDate?: string;

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

export class UpdateInboundStatusDto {
  @IsEnum(InboundNoteStatus)
  status: InboundNoteStatus;
}

export class QueryInboundDto {
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
