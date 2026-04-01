import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Purge all daily_metrics rows so they get recomputed with corrected logic:
 * - additions/deletions/changed_files now only count merged PRs
 * - NULL upsert bug is fixed (previous migration)
 *
 * The nightly aggregation or manual POST /api/v1/admin/aggregate will
 * repopulate this table with correct values.
 */
export class PurgeStaleMetricsForReaggregation1775004000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE "daily_metrics"`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Data is derived — re-run aggregation to restore
  }
}
