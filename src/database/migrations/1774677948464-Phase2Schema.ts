import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase2Schema1774677948464 implements MigrationInterface {
    name = 'Phase2Schema1774677948464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."daily_metrics_metric_key_enum" AS ENUM('prs_opened', 'prs_merged', 'prs_closed_unmerged', 'reviews_submitted', 'additions', 'deletions', 'changed_files', 'avg_time_to_first_review_hours', 'avg_time_to_merge_hours', 'avg_pr_size', 'prs_opened_total', 'prs_merged_total', 'reviews_submitted_total')`);
        await queryRunner.query(`CREATE TABLE "daily_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "metric_date" date NOT NULL, "org_id" uuid NOT NULL, "repo_id" uuid, "developer_id" uuid, "branch" character varying(255), "metric_key" "public"."daily_metrics_metric_key_enum" NOT NULL, "metric_value" numeric(18,4) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bb5c6908d3c8465b5057f8cb5de" UNIQUE ("metric_date", "org_id", "repo_id", "developer_id", "metric_key", "branch"), CONSTRAINT "PK_0b33a3faffa5fbb3d4dad78c4e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c2cd0f69ab98ebb4b4277c752e" ON "daily_metrics" ("metric_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_197ba3e4a0a967711ca6645f44" ON "daily_metrics" ("org_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ee264ea62a38d7b67e6c0567b6" ON "daily_metrics" ("repo_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2493a157da3d06d614bc0221bf" ON "daily_metrics" ("developer_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_295abcd49c59a105337eceafa7" ON "daily_metrics" ("branch") `);
        await queryRunner.query(`CREATE TYPE "public"."user_org_assignments_org_role_enum" AS ENUM('admin', 'manager')`);
        await queryRunner.query(`CREATE TABLE "user_org_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "org_id" uuid NOT NULL, "org_role" "public"."user_org_assignments_org_role_enum" NOT NULL DEFAULT 'manager', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b3399fc2cd60656de113ba372f6" UNIQUE ("user_id", "org_id"), CONSTRAINT "PK_c88e7888a51a1d009d8fc28e356" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_12f6b2166b71df1ca4687c0525" ON "user_org_assignments" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fe631626d4c9b93ca0531e26aa" ON "user_org_assignments" ("org_id") `);
        await queryRunner.query(`CREATE TABLE "user_repo_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "repo_id" uuid NOT NULL, "org_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_64437632cb8f16a427ea0de1e61" UNIQUE ("user_id", "repo_id"), CONSTRAINT "PK_7c7af8fd4f24a22fcfece67d164" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8b6a551ebbe95f4cece9a6a370" ON "user_repo_assignments" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2834266599c8a4c899e8d9d289" ON "user_repo_assignments" ("repo_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3d8ba6f82ceb55c9a122bd9840" ON "user_repo_assignments" ("org_id") `);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(512) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "ip_address" character varying(45), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "method" character varying(10) NOT NULL, "path" character varying(500) NOT NULL, "status_code" integer NOT NULL, "ip_address" character varying(45), "duration_ms" integer, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_04e7fd1c9cb4c12edd22bd9ed0" ON "audit_logs" ("method") `);
        await queryRunner.query(`CREATE INDEX "IDX_df06717c685a2a639ce47bce76" ON "audit_logs" ("status_code") `);
        await queryRunner.query(`CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs" ("created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'manager', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "hashed_password" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'viewer', "is_first_admin" boolean NOT NULL DEFAULT false, "archived" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "password_reset_otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "otp_code" character varying(6) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b4f4c493a1ee383f93ff3a5017" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a4a5ac367f438cfef8fa13e802" ON "password_reset_otps" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "user_org_assignments" ADD CONSTRAINT "FK_12f6b2166b71df1ca4687c0525b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_repo_assignments" ADD CONSTRAINT "FK_8b6a551ebbe95f4cece9a6a3703" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_otps" ADD CONSTRAINT "FK_a4a5ac367f438cfef8fa13e8023" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_otps" DROP CONSTRAINT "FK_a4a5ac367f438cfef8fa13e8023"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`ALTER TABLE "user_repo_assignments" DROP CONSTRAINT "FK_8b6a551ebbe95f4cece9a6a3703"`);
        await queryRunner.query(`ALTER TABLE "user_org_assignments" DROP CONSTRAINT "FK_12f6b2166b71df1ca4687c0525b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a4a5ac367f438cfef8fa13e802"`);
        await queryRunner.query(`DROP TABLE "password_reset_otps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df06717c685a2a639ce47bce76"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_04e7fd1c9cb4c12edd22bd9ed0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a7838d2ba25be1342091b6695f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d8ba6f82ceb55c9a122bd9840"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2834266599c8a4c899e8d9d289"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b6a551ebbe95f4cece9a6a370"`);
        await queryRunner.query(`DROP TABLE "user_repo_assignments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe631626d4c9b93ca0531e26aa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_12f6b2166b71df1ca4687c0525"`);
        await queryRunner.query(`DROP TABLE "user_org_assignments"`);
        await queryRunner.query(`DROP TYPE "public"."user_org_assignments_org_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_295abcd49c59a105337eceafa7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2493a157da3d06d614bc0221bf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee264ea62a38d7b67e6c0567b6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_197ba3e4a0a967711ca6645f44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2cd0f69ab98ebb4b4277c752e"`);
        await queryRunner.query(`DROP TABLE "daily_metrics"`);
        await queryRunner.query(`DROP TYPE "public"."daily_metrics_metric_key_enum"`);
    }

}
