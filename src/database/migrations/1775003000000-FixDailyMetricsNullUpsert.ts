import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix: daily_metrics unique constraint treated NULLs as distinct (PostgreSQL default),
 * causing duplicate rows on every nightly aggregation run for metrics where
 * repo_id, developer_id, or branch are NULL (e.g. prs_opened_total, deploys_total).
 *
 * This migration:
 * 1. Drops the old unique constraint
 * 2. Removes duplicate rows (keeps the most recently created one per logical key)
 * 3. Creates a new unique index using COALESCE to treat NULLs as equal
 */
export class FixDailyMetricsNullUpsert1775003000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the old constraint that doesn't handle NULLs correctly
    await queryRunner.query(`
      ALTER TABLE "daily_metrics"
      DROP CONSTRAINT IF EXISTS "UQ_bb5c6908d3c8465b5057f8cb5de"
    `);

    // 2. Delete duplicate rows, keeping only the one with the latest created_at per logical key.
    //    We use COALESCE to group NULLs together.
    await queryRunner.query(`
      DELETE FROM "daily_metrics"
      WHERE id NOT IN (
        SELECT DISTINCT ON (
          metric_date,
          org_id,
          COALESCE(repo_id, '00000000-0000-0000-0000-000000000000'),
          COALESCE(developer_id, '00000000-0000-0000-0000-000000000000'),
          metric_key,
          COALESCE(branch, '__null__')
        ) id
        FROM "daily_metrics"
        ORDER BY
          metric_date,
          org_id,
          COALESCE(repo_id, '00000000-0000-0000-0000-000000000000'),
          COALESCE(developer_id, '00000000-0000-0000-0000-000000000000'),
          metric_key,
          COALESCE(branch, '__null__'),
          created_at DESC
      )
    `);

    // 3. Create a unique index that treats NULLs as equal via COALESCE
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_daily_metrics_logical_key"
      ON "daily_metrics" (
        metric_date,
        org_id,
        COALESCE(repo_id, '00000000-0000-0000-0000-000000000000'),
        COALESCE(developer_id, '00000000-0000-0000-0000-000000000000'),
        metric_key,
        COALESCE(branch, '__null__')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_daily_metrics_logical_key"`);

    await queryRunner.query(`
      ALTER TABLE "daily_metrics"
      ADD CONSTRAINT "UQ_bb5c6908d3c8465b5057f8cb5de"
      UNIQUE ("metric_date", "org_id", "repo_id", "developer_id", "metric_key", "branch")
    `);
  }
}
