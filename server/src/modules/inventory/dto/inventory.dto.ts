import { IsString, IsOptional, IsNumber } from 'class-validator';

export class QueryInventoryDto {
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
  page?: number;

  @IsOptional()
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}
