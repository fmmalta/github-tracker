import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type WebhookStatus = 'received' | 'queued' | 'processing' | 'success' | 'failed' | 'duplicate';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  delivery_id!: string; // X-GitHub-Delivery header — idempotency key

  @Index()
  @Column({ type: 'varchar', length: 100 })
  event_type!: string; // X-GitHub-Event header (e.g. "pull_request")

  @Column({ type: 'varchar', length: 100, nullable: true })
  action!: string | null; // Event action (e.g. "opened", "closed")

  @Column({
    type: 'enum',
    enum: ['received', 'queued', 'processing', 'success', 'failed', 'duplicate'],
    default: 'received',
  })
  status!: WebhookStatus;

  @Column({ type: 'jsonb' })
  payload_json!: Record<string, unknown>; // Raw webhook payload for audit + replay

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @Column({ type: 'int', default: 0 })
  retry_count!: number;

  @Index()
  @Column({ type: 'timestamp with time zone' })
  received_at!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at!: Date | null;

  // org_id for multi-org scoping (DATA-07)
  @Index()
  @Column({ type: 'uuid', nullable: true })
  org_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
