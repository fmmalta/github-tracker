import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Repository } from './repository.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'bigint', unique: true })
  github_id!: number; // GitHub org ID

  @Column({ type: 'varchar', length: 255 })
  login!: string; // GitHub org login (e.g. "my-org")

  @Column({ type: 'varchar', length: 500, nullable: true })
  name!: string | null;

  @Column({ type: 'text', nullable: true })
  installation_id!: string | null; // GitHub App installation ID

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @OneToMany(() => Repository, repo => repo.organization)
  repositories!: Repository[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
