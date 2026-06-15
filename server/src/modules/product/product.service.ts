import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Unit } from '../../entities/unit.entity';
import { Warehouse } from '../../entities/warehouse.entity';
import { Location } from '../../entities/location.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Location) private locationRepo: Repository<Location>,
  ) {}

  async searchProducts(keyword: string) {
    const list = await this.productRepo.find({
      where: [
        { name: Like(`%${keyword}%`), isActive: true },
        { code: Like(`%${keyword}%`), isActive: true },
      ],
      relations: ['unit', 'category'],
      take: 20,
    });
    return { list, total: list.length };
  }

  async findByBarcode(code: string) {
    return this.productRepo.findOne({
      where: { code, isActive: true },
      relations: ['unit', 'category'],
    });
  }

  async findAll(params: { page?: number; pageSize?: number; keyword?: string; categoryId?: string }) {
    const { page = 1, pageSize = 20, keyword, categoryId } = params;
    const where: any = {};
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    const [list, total] = await this.productRepo.findAndCount({
      where,
      relations: ['unit', 'category'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    return this.productRepo.findOne({ where: { id }, relations: ['unit', 'category'] });
  }

  async create(dto: Partial<Product>) {
    if (!dto.code) {
      dto.code = await this.generateCode();
    }
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  /**
   * 生成唯一商品编码：SP + 14位时间戳 + 4位随机字符
   */
  private async generateCode(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `SP${timestamp}${random}`;
    // 检查是否已存在，极小概率碰撞
    const exists = await this.productRepo.findOne({ where: { code } });
    if (exists) {
      return this.generateCode(); // 递归重新生成
    }
    return code;
  }

  async update(id: string, dto: Partial<Product>) {
    await this.productRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.productRepo.update(id, { isActive: false });
    return { message: '删除成功' };
  }

  async getCategories() {
    return this.categoryRepo.find({ order: { sort: 'ASC' } });
  }

  async createCategory(dto: Partial<Category>) {
    return this.categoryRepo.save(dto);
  }

  async getUnits() {
    return this.unitRepo.find();
  }

  async createUnit(dto: Partial<Unit>) {
    return this.unitRepo.save(dto);
  }

  async getWarehouses() {
    return this.warehouseRepo.find({ where: { isActive: true } });
  }

  async createWarehouse(dto: Partial<Warehouse>) {
    return this.warehouseRepo.save(dto);
  }

  async getLocations(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    return this.locationRepo.find({ where, relations: ['warehouse'] });
  }

  async createLocation(dto: Partial<Location>) {
    return this.locationRepo.save(dto);
  }
}
