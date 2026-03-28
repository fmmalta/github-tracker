import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase(), archived: false } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id, archived: false } });
  }

  async countActiveUsers(): Promise<number> {
    return this.repo.count({ where: { archived: false } });
  }

  async create(data: { email: string; hashed_password: string; role: UserRole; is_first_admin: boolean }): Promise<User> {
    const user = this.repo.create({ ...data, email: data.email.toLowerCase() });
    return this.repo.save(user);
  }

  async updatePassword(userId: string, hashed_password: string): Promise<void> {
    await this.repo.update(userId, { hashed_password });
  }
}
