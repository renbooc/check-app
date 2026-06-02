import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(phone: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { phone, isActive: true },
      select: ['id', 'name', 'phone', 'password', 'role', 'avatar', 'storeId', 'storeName'],
    });
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    const { password: _, ...result } = user;
    return result;
  }

  async login(user: Partial<User>) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      storeId: user.storeId,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        storeId: user.storeId,
        storeName: user.storeName,
      },
    };
  }

  async wxLogin(code: string) {
    return { code };
  }

  async register(dto: { name: string; phone: string; password: string; role: string }) {
    const exists = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (exists) throw new UnauthorizedException('手机号已注册');
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ ...dto, password: hashedPassword });
    await this.userRepo.save(user);
    const { password: _, ...result } = user;
    return result;
  }
}
