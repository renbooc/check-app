import { IsString, IsOptional } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  warehouseId: string;
}
