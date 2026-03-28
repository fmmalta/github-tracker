import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('user_repo_assignments')
@Unique(['user_id', 'repo_id'])
export class UserRepoAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, user => user.repo_assignments)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ type: 'uuid' })
  repo_id!: string;  // FK to repositories.id

  @Index()
  @Column({ type: 'uuid' })
  org_id!: string;   // Denormalized for efficient scoping queries

  @CreateDateColumn()
  created_at!: Date;
}
