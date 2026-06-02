import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Customer } from '../../entities/customer.entity';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
  ) {}

  async findAll(params: { page?: number; pageSize?: number; keyword?: string }) {
    const { page = 1, pageSize = 20, keyword } = params;
    const where: any = { isActive: true };
    if (keyword) where.name = Like(`%${keyword}%`);
    const [list, total] = await this.customerRepo.findAndCount({
      where,
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
    return this.customerRepo.save(dto);
  }

  async update(id: string, dto: Partial<Customer>) {
    await this.customerRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.customerRepo.update(id, { isActive: false });
    return { message: '删除成功' };
  }
}
