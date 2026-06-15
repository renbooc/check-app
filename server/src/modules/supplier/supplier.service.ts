import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { Supplier } from '../../entities/supplier.entity';
import { toPinyinInitials } from '../../common/utils/pinyin';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
  ) {}

  async findAll(params: { page?: number; pageSize?: number; keyword?: string }) {
    const { page = 1, pageSize = 20, keyword } = params;
    if (keyword) {
      const qb = this.supplierRepo.createQueryBuilder('s')
        .where('s.status != :void', { void: 'void' })
        .andWhere('(s.name LIKE :kw OR s.pinyin LIKE :kw OR s.phone LIKE :kw)',
          { kw: `%${keyword}%` })
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .orderBy('s.createdAt', 'DESC');
      const [list, total] = await qb.getManyAndCount();
      return { list, total, page, pageSize };
    }
    const [list, total] = await this.supplierRepo.findAndCount({
      where: { status: Not('void') },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    return this.supplierRepo.findOne({ where: { id } });
  }

  async create(dto: Partial<Supplier>) {
    if (!dto.code) {
      dto.code = await this.generateCode();
    }
    if (!dto.pinyin && dto.name) {
      dto.pinyin = toPinyinInitials(dto.name);
    }
    return this.supplierRepo.save(dto);
  }

  async update(id: string, dto: Partial<Supplier>) {
    if (dto.code) delete dto.code;
    if (dto.name && !dto.pinyin) {
      dto.pinyin = toPinyinInitials(dto.name);
    }
    await this.supplierRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.supplierRepo.update(id, { status: 'void', isActive: false });
    return { message: '删除成功' };
  }

  /**
   * 生成顺序供应商编码：S + 5位数字（从 00001 开始递增）
   */
  private async generateCode(): Promise<string> {
    const last = await this.supplierRepo
      .createQueryBuilder('s')
      .select('s.code')
      .where("s.code ~ '^S[0-9]{5}$'")
      .orderBy('s.code', 'DESC')
      .getRawOne();
    const seq = last ? parseInt(last.s_code.substring(1), 10) + 1 : 1;
    return `S${String(seq).padStart(5, '0')}`;
  }
}
