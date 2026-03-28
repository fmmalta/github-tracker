import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('user_org_assignments')
@Unique(['user_id', 'org_id'])
export class UserOrgAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, user => user.org_assignments)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ type: 'uuid' })
  org_id!: string;  // FK to organizations.id

  // Admins are assigned at org level with role='admin'; managers with role='manager'
  @Column({ type: 'enum', enum: ['admin', 'manager'], default: 'manager' })
  org_role!: 'admin' | 'manager';

  @CreateDateColumn()
  created_at!: Date;
}
