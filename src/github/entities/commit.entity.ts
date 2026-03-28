import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { PullRequest } from './pull-request.entity';
import { Developer } from './developer.entity';

@Entity('commits')
export class Commit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 40, unique: true })
  sha!: string; // Git commit SHA

  @Column({ type: 'varchar', length: 2000, nullable: true })
  message!: string | null;

  @Index()
  @Column({ type: 'timestamp with time zone' })
  committed_at!: Date;

  @Column({ type: 'int', default: 0 })
  additions!: number;

  @Column({ type: 'int', default: 0 })
  deletions!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  author_login!: string | null;

  @ManyToOne(() => Developer, { nullable: true })
  @JoinColumn({ name: 'author_id' })
  author!: Developer | null;

  @Column({ type: 'uuid', nullable: true })
  author_id!: string | null;

  @ManyToOne(() => PullRequest, pr => pr.commits)
  @JoinColumn({ name: 'pull_request_id' })
  pull_request!: PullRequest;

  @Column({ type: 'uuid' })
  pull_request_id!: string;

  // org_id for multi-org scoping (DATA-07)
  @Index()
  @Column({ type: 'uuid' })
  org_id!: string;

  @CreateDateColumn()
  synced_at!: Date;
}
