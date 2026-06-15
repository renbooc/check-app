import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { toPinyinInitials } from '../../common/utils/pinyin';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
  ) {}

  async findAll(params: { page?: number; pageSize?: number; keyword?: string }) {
    const { page = 1, pageSize = 20, keyword } = params;
    if (keyword) {
      const qb = this.customerRepo.createQueryBuilder('c')
        .where('c.status != :void', { void: 'void' })
        .andWhere('(c.name LIKE :kw OR c.pinyin LIKE :kw OR c.phone LIKE :kw)',
          { kw: `%${keyword}%` })
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .orderBy('c.createdAt', 'DESC');
      const [list, total] = await qb.getManyAndCount();
      return { list, total, page, pageSize };
    }
    const [list, total] = await this.customerRepo.findAndCount({
      where: { status: Not('void') },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    return this.customerRepo.findOne({ where: { id } });
  }

  async create(dto: Partial<Customer>) {
    if (!dto.code) {
      dto.code = await this.generateCode();
    }
    if (!dto.pinyin && dto.name) {
      dto.pinyin = toPinyinInitials(dto.name);
    }
    return this.customerRepo.save(dto);
  }

  async update(id: string, dto: Partial<Customer>) {
    if (dto.code) delete dto.code;
    if (dto.name && !dto.pinyin) {
      dto.pinyin = toPinyinInitials(dto.name);
    }
    await this.customerRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.customerRepo.update(id, { status: 'void', isActive: false });
    return { message: '删除成功' };
  }

  private async generateCode(): Promise<string> {
    const last = await this.customerRepo
      .createQueryBuilder('c')
      .select('c.code')
      .where("c.code ~ '^C[0-9]{5}$'")
      .orderBy('c.code', 'DESC')
      .getRawOne();
    const seq = last ? parseInt(last.c_code.substring(1), 10) + 1 : 1;
    return `C${String(seq).padStart(5, '0')}`;
  }
}
