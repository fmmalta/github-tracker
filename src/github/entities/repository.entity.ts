import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { PullRequest } from './pull-request.entity';

@Entity('repositories')
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'bigint', unique: true })
  github_id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string; // e.g. "my-repo"

  @Column({ type: 'varchar', length: 511 })
  full_name!: string; // e.g. "my-org/my-repo"

  @Column({ type: 'boolean', default: false })
  is_private!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  language!: string | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  // org_id scoping for multi-org expansion (DATA-07)
  @Index()
  @ManyToOne(() => Organization, org => org.repositories)
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  org_id!: string;

  @OneToMany(() => PullRequest, pr => pr.repository)
  pull_requests!: PullRequest[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
