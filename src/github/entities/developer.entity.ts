import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { PullRequest } from './pull-request.entity';
import { Review } from './review.entity';

@Entity('developers')
export class Developer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'bigint', unique: true })
  github_id!: number;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  login!: string; // GitHub username

  @Column({ type: 'varchar', length: 500, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url!: string | null;

  @OneToMany(() => PullRequest, pr => pr.author)
  prs_authored!: PullRequest[];

  @OneToMany(() => Review, review => review.reviewer)
  reviews_submitted!: Review[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
