import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenFamilyToRefreshTokens1775002000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN "token_family" uuid NOT NULL DEFAULT gen_random_uuid()
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_token_family" ON "refresh_tokens" ("token_family")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_token_family"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "token_family"`);
  }
}
