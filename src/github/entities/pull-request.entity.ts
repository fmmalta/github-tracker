import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Developer } from './developer.entity';
import { Repository } from './repository.entity';
import { Review } from './review.entity';
import { Commit } from './commit.entity';

export type PrState = 'open' | 'closed' | 'merged';

@Entity('pull_requests')
export class PullRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'bigint', unique: true })
  github_id!: number; // GitHub PR ID (global unique)

  @Index()
  @Column({ type: 'int' })
  number!: number; // PR number within repo

  @Column({ type: 'varchar', length: 1000 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ['open', 'closed', 'merged'],
    default: 'open',
  })
  state!: PrState;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  base_branch!: string; // e.g. "main"

  @Column({ type: 'varchar', length: 255 })
  head_branch!: string; // feature branch name

  @Column({ type: 'int', default: 0 })
  additions!: number;

  @Column({ type: 'int', default: 0 })
  deletions!: number;

  @Column({ type: 'int', default: 0 })
  changed_files!: number;

  @Index()
  @Column({ type: 'timestamp with time zone' })
  github_created_at!: Date; // When PR was created on GitHub

  @Column({ type: 'timestamp with time zone', nullable: true })
  github_merged_at!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  github_closed_at!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  first_review_at!: Date | null; // Populated during processing

  // CI/pipeline status from GitHub Check Runs API
  // Values: 'success', 'failure', 'neutral', 'cancelled', 'timed_out', 'action_required', 'stale', 'skipped', null
  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  check_conclusion!: string | null;

  // Foreign keys — store login for denormalized access
  @Column({ type: 'varchar', length: 255 })
  author_login!: string;

  @ManyToOne(() => Developer, dev => dev.prs_authored, { nullable: true })
  @JoinColumn({ name: 'author_id' })
  author!: Developer | null;

  @Column({ type: 'uuid', nullable: true })
  author_id!: string | null;

  @ManyToOne(() => Repository, repo => repo.pull_requests)
  @JoinColumn({ name: 'repository_id' })
  repository!: Repository;

  @Column({ type: 'uuid' })
  repository_id!: string;

  // org_id for multi-org scoping (DATA-07)
  @Index()
  @Column({ type: 'uuid' })
  org_id!: string;

  @OneToMany(() => Review, review => review.pull_request)
  reviews!: Review[];

  @OneToMany(() => Commit, commit => commit.pull_request)
  commits!: Commit[];

  @CreateDateColumn()
  synced_at!: Date; // When we synced this from GitHub

  @UpdateDateColumn()
  updated_at!: Date;
}
