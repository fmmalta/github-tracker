import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('password_reset_otps')
export class PasswordResetOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 6 })
  otp_code!: string;  // 6-digit numeric OTP (generated securely)

  @Column({ type: 'timestamp with time zone' })
  expires_at!: Date;  // Created_at + 15 minutes

  @Column({ type: 'boolean', default: false })
  used!: boolean;  // Consumed after first use (one-time)

  @CreateDateColumn()
  created_at!: Date;
}
