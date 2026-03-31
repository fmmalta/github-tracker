import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Repository } from './repository.entity';

export type DeploymentStatusState =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'pending'
  | 'queued'
  | 'success';

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'bigint', unique: true })
  github_id!: number;

  @ManyToOne(() => Repository, { nullable: false })
  @JoinColumn({ name: 'repository_id' })
  repository!: Repository;

  @Index()
  @Column({ type: 'uuid' })
  repository_id!: string;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Index()
  @Column({ type: 'uuid' })
  org_id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  environment!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sha!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ref!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  task!: string | null;

  @Index()
  @Column({ type: 'timestamp with time zone' })
  github_created_at!: Date;

  @Index()
  @Column({ type: 'varchar', length: 32, nullable: true })
  latest_status_state!: DeploymentStatusState | null;

  @Index()
  @Column({ type: 'timestamp with time zone', nullable: true })
  latest_status_at!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  status_payload_json!: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
