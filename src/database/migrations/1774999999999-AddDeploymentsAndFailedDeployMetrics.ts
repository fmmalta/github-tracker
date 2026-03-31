import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeploymentsAndFailedDeployMetrics1774999999999 implements MigrationInterface {
  name = 'AddDeploymentsAndFailedDeployMetrics1774999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."daily_metrics_metric_key_enum" ADD VALUE IF NOT EXISTS 'failed_deploys'`);
    await queryRunner.query(`ALTER TYPE "public"."daily_metrics_metric_key_enum" ADD VALUE IF NOT EXISTS 'failed_deploys_total'`);

    await queryRunner.query(`
      CREATE TABLE "deployments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "github_id" bigint NOT NULL,
        "repository_id" uuid NOT NULL,
        "org_id" uuid NOT NULL,
        "environment" character varying(255),
        "sha" character varying(100),
        "ref" character varying(255),
        "task" character varying(100),
        "github_created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "latest_status_state" character varying(32),
        "latest_status_at" TIMESTAMP WITH TIME ZONE,
        "status_payload_json" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_deployments_github_id" UNIQUE ("github_id"),
        CONSTRAINT "PK_deployments_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_deployments_github_id" ON "deployments" ("github_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_repository_id" ON "deployments" ("repository_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_org_id" ON "deployments" ("org_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_github_created_at" ON "deployments" ("github_created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_latest_status_state" ON "deployments" ("latest_status_state")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_latest_status_at" ON "deployments" ("latest_status_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_org_created_at" ON "deployments" ("org_id", "github_created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_repo_created_at" ON "deployments" ("repository_id", "github_created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_deployments_org_status_time" ON "deployments" ("org_id", "latest_status_state", "latest_status_at")`);

    await queryRunner.query(`
      ALTER TABLE "deployments"
      ADD CONSTRAINT "FK_deployments_repository_id"
      FOREIGN KEY ("repository_id") REFERENCES "repositories"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "deployments"
      ADD CONSTRAINT "FK_deployments_org_id"
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "deployments" DROP CONSTRAINT "FK_deployments_org_id"`);
    await queryRunner.query(`ALTER TABLE "deployments" DROP CONSTRAINT "FK_deployments_repository_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_org_status_time"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_repo_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_org_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_latest_status_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_latest_status_state"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_github_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_org_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_repository_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_github_id"`);
    await queryRunner.query(`DROP TABLE "deployments"`);
  }
}
