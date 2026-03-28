import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { UserOrgAssignment } from './user-org-assignment.entity';
import { UserRepoAssignment } from './user-repo-assignment.entity';
import { RefreshToken } from './refresh-token.entity';
import { AuditLog } from './audit-log.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  hashed_password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role!: UserRole;

  @Column({ type: 'boolean', default: false })
  is_first_admin!: boolean; // True for the auto-activated first user

  @Column({ type: 'boolean', default: false })
  archived!: boolean; // Soft-delete; historical metrics preserved

  @OneToMany(() => UserOrgAssignment, assignment => assignment.user)
  org_assignments!: UserOrgAssignment[];

  @OneToMany(() => UserRepoAssignment, assignment => assignment.user)
  repo_assignments!: UserRepoAssignment[];

  @OneToMany(() => RefreshToken, token => token.user)
  refresh_tokens!: RefreshToken[];

  @OneToMany(() => AuditLog, log => log.user)
  audit_logs!: AuditLog[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
