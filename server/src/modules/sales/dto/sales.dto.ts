import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SalesOrderStatus } from '../../../entities/sales-order.entity';

export class SalesOrderItemDto {
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

export class CreateSalesDto {
  @IsString()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  warehouseName?: string;
}

export class UpdateSalesDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items?: SalesOrderItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  warehouseName?: string;
}

export class UpdateSalesStatusDto {
  @IsEnum(SalesOrderStatus)
  status: SalesOrderStatus;
}

export class QuerySalesDto {
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
