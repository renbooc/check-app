import { IsString, IsOptional, IsNumber } from 'class-validator';
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
