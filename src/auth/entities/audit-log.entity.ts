import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;  // Null for unauthenticated requests (signup, login)

  @ManyToOne(() => User, user => user.audit_logs, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  method!: string;  // GET, POST, PATCH, DELETE

  @Column({ type: 'varchar', length: 500 })
  path!: string;

  @Index()
  @Column({ type: 'int' })
  status_code!: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address!: string | null;

  @Column({ type: 'int', nullable: true })
  duration_ms!: number | null;  // Request duration in milliseconds

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;  // Extra context (event_type for user creation, etc.)

  @Index()
  @CreateDateColumn()
  created_at!: Date;
}
