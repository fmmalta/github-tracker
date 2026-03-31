import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const password = configService.get<string>('DATABASE_PASSWORD', 'postgres');
        const useSsl = configService.get<string>('DATABASE_SSL', 'false') === 'true';

        if (isProduction && (!password || password === 'postgres')) {
          throw new Error('[SECURITY] DATABASE_PASSWORD must be set to a non-default value in production.');
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DATABASE_HOST', 'localhost'),
          port: configService.get<number>('DATABASE_PORT', 5432),
          database: configService.get<string>('DATABASE_NAME', 'github_tracker'),
          username: configService.get<string>('DATABASE_USER', 'postgres'),
          password,
          ssl: useSsl ? { rejectUnauthorized: true } : false,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: false,
          migrationsRun: true,
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
