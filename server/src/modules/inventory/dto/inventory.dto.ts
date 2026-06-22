import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryInventoryDto {
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
  warehouseId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  locationCode?: string;
}

export class SaveCheckDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsNumber()
  checkCount: number;

  @IsNumber()
  stockCount: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryCheckRecordDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class BatchCheckItemDto {
  @IsOptional()
  @IsString()
  detailId?: string;

  @IsString()
  batchNo: string;

  @IsOptional()
  @IsString()
  productionDate?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  locationCode?: string;

  @IsNumber()
  stockCount: number;

  @IsNumber()
  checkCount: number;
}

export class SaveCheckBatchDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchCheckItemDto)
  items: BatchCheckItemDto[];
}
