import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Developer } from './developer.entity';
import { PullRequest } from './pull-request.entity';

export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'bigint', unique: true })
  github_id!: number; // GitHub review ID

  @Column({
    type: 'enum',
    enum: ['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED'],
  })
  state!: ReviewState;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Index()
  @Column({ type: 'timestamp with time zone' })
  submitted_at_github!: Date; // Raw timestamp from GitHub

  @Column({ type: 'varchar', length: 255 })
  reviewer_login!: string; // Denormalized for query convenience

  @ManyToOne(() => Developer, dev => dev.reviews_submitted, { nullable: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: Developer | null;

  @Column({ type: 'uuid', nullable: true })
  reviewer_id!: string | null;

  @ManyToOne(() => PullRequest, pr => pr.reviews)
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

  @UpdateDateColumn()
  updated_at!: Date;
}
