import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type SyncJobType = 'initial_backfill' | 'scheduled' | 'manual';
export type SyncJobStatus = 'pending' | 'in_progress' | 'success' | 'failed';

@Entity('sync_jobs')
export class SyncJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ['initial_backfill', 'scheduled', 'manual'],
  })
  type!: SyncJobType;

  @Index()
  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'success', 'failed'],
    default: 'pending',
  })
  status!: SyncJobStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  org_login!: string | null; // Which org this sync covers

  // org_id for multi-org scoping (DATA-07)
  @Index()
  @Column({ type: 'uuid', nullable: true })
  org_id!: string | null;

  @Column({ type: 'int', default: 0 })
  repos_synced!: number;

  @Column({ type: 'int', default: 0 })
  prs_synced!: number;

  @Column({ type: 'int', default: 0 })
  reviews_synced!: number;

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @Column({ type: 'int', default: 0 })
  retry_count!: number;

  @Column({ type: 'jsonb', nullable: true })
  progress_metadata!: Record<string, unknown> | null; // Cursor positions, page counts, etc.

  @Index()
  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  finished_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
