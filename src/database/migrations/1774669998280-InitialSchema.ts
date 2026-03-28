import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1774669998280 implements MigrationInterface {
    name = 'InitialSchema1774669998280'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."webhook_deliveries_status_enum" AS ENUM('received', 'queued', 'processing', 'success', 'failed', 'duplicate')`);
        await queryRunner.query(`CREATE TABLE "webhook_deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "delivery_id" character varying(255) NOT NULL, "event_type" character varying(100) NOT NULL, "action" character varying(100), "status" "public"."webhook_deliveries_status_enum" NOT NULL DEFAULT 'received', "payload_json" jsonb NOT NULL, "error_message" text, "retry_count" integer NOT NULL DEFAULT '0', "received_at" TIMESTAMP WITH TIME ZONE NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE, "org_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_535dd409947fb6d8fc6dfc0112a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6c1db1ec505a69c927e3c4dcee" ON "webhook_deliveries" ("delivery_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d2625f04a09451b18c821f53f1" ON "webhook_deliveries" ("event_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_c18904d7a2c1aebbccab714e82" ON "webhook_deliveries" ("received_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_6ee70d1a9efe966b770ed12e47" ON "webhook_deliveries" ("org_id") `);
        await queryRunner.query(`CREATE TYPE "public"."sync_jobs_type_enum" AS ENUM('initial_backfill', 'scheduled', 'manual')`);
        await queryRunner.query(`CREATE TYPE "public"."sync_jobs_status_enum" AS ENUM('pending', 'in_progress', 'success', 'failed')`);
        await queryRunner.query(`CREATE TABLE "sync_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."sync_jobs_type_enum" NOT NULL, "status" "public"."sync_jobs_status_enum" NOT NULL DEFAULT 'pending', "org_login" character varying(255), "org_id" uuid, "repos_synced" integer NOT NULL DEFAULT '0', "prs_synced" integer NOT NULL DEFAULT '0', "reviews_synced" integer NOT NULL DEFAULT '0', "error_message" text, "retry_count" integer NOT NULL DEFAULT '0', "progress_metadata" jsonb, "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8586b15058c8811de6286052139" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8b169747fff621c89146688ccd" ON "sync_jobs" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_70597b4533496985f96871a14b" ON "sync_jobs" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_a175fed7de0c99c37d8cb277a6" ON "sync_jobs" ("org_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_23f15508c47693f3ead2d743d9" ON "sync_jobs" ("started_at") `);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "github_id" bigint NOT NULL, "login" character varying(255) NOT NULL, "name" character varying(500), "installation_id" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f02786e1e7abd8e19537e691ba6" UNIQUE ("github_id"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f02786e1e7abd8e19537e691ba" ON "organizations" ("github_id") `);
        await queryRunner.query(`CREATE TABLE "repositories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "github_id" bigint NOT NULL, "name" character varying(255) NOT NULL, "full_name" character varying(511) NOT NULL, "is_private" boolean NOT NULL DEFAULT false, "language" character varying(255), "is_active" boolean NOT NULL DEFAULT true, "org_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c2a6f4a6c8d66e8717283562075" UNIQUE ("github_id"), CONSTRAINT "PK_ef0c358c04b4f4d29b8ca68ddff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c2a6f4a6c8d66e871728356207" ON "repositories" ("github_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0817f53f8503847af03983f86b" ON "repositories" ("org_id") `);
        await queryRunner.query(`CREATE TABLE "commits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sha" character varying(40) NOT NULL, "message" character varying(2000), "committed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "additions" integer NOT NULL DEFAULT '0', "deletions" integer NOT NULL DEFAULT '0', "author_login" character varying(255), "author_id" uuid, "pull_request_id" uuid NOT NULL, "org_id" uuid NOT NULL, "synced_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2d802ca1c859d78633b6ac35aad" UNIQUE ("sha"), CONSTRAINT "PK_87adcaf9b8d0f42fee0481c0917" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2d802ca1c859d78633b6ac35aa" ON "commits" ("sha") `);
        await queryRunner.query(`CREATE INDEX "IDX_b14e9bf00d9ad5a35e5f764d2e" ON "commits" ("committed_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_dc4002cb4f157f38617deed20f" ON "commits" ("org_id") `);
        await queryRunner.query(`CREATE TYPE "public"."pull_requests_state_enum" AS ENUM('open', 'closed', 'merged')`);
        await queryRunner.query(`CREATE TABLE "pull_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "github_id" bigint NOT NULL, "number" integer NOT NULL, "title" character varying(1000) NOT NULL, "body" text, "state" "public"."pull_requests_state_enum" NOT NULL DEFAULT 'open', "base_branch" character varying(255) NOT NULL, "head_branch" character varying(255) NOT NULL, "additions" integer NOT NULL DEFAULT '0', "deletions" integer NOT NULL DEFAULT '0', "changed_files" integer NOT NULL DEFAULT '0', "github_created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "github_merged_at" TIMESTAMP WITH TIME ZONE, "github_closed_at" TIMESTAMP WITH TIME ZONE, "first_review_at" TIMESTAMP WITH TIME ZONE, "author_login" character varying(255) NOT NULL, "author_id" uuid, "repository_id" uuid NOT NULL, "org_id" uuid NOT NULL, "synced_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0a24eae23bad88ac579cac8d9bf" UNIQUE ("github_id"), CONSTRAINT "PK_e8a8aa8710c3a9650a19a9c2e7b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0a24eae23bad88ac579cac8d9b" ON "pull_requests" ("github_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d257b7b59f5cc0bd9f6af96f18" ON "pull_requests" ("number") `);
        await queryRunner.query(`CREATE INDEX "IDX_b03d9988c25a41e70fd1ad9ad3" ON "pull_requests" ("state") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b9ae237e2105d43675e15875a" ON "pull_requests" ("base_branch") `);
        await queryRunner.query(`CREATE INDEX "IDX_48df8daebf8691ee0c79a1992d" ON "pull_requests" ("github_created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_815d5d24bf191fe55bb7603a38" ON "pull_requests" ("org_id") `);
        await queryRunner.query(`CREATE TABLE "developers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "github_id" bigint NOT NULL, "login" character varying(255) NOT NULL, "name" character varying(500), "email" character varying(500), "avatar_url" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_811a8874cdc8d7c6e4eb0b4fd41" UNIQUE ("github_id"), CONSTRAINT "UQ_b857ddc4fd4392133599b69bc64" UNIQUE ("login"), CONSTRAINT "PK_247719240b950bd26dec14bdd21" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_811a8874cdc8d7c6e4eb0b4fd4" ON "developers" ("github_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b857ddc4fd4392133599b69bc6" ON "developers" ("login") `);
        await queryRunner.query(`CREATE TYPE "public"."reviews_state_enum" AS ENUM('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED')`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "github_id" bigint NOT NULL, "state" "public"."reviews_state_enum" NOT NULL, "body" text, "submitted_at_github" TIMESTAMP WITH TIME ZONE NOT NULL, "reviewer_login" character varying(255) NOT NULL, "reviewer_id" uuid, "pull_request_id" uuid NOT NULL, "org_id" uuid NOT NULL, "synced_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_28f848317b29b550722635316e5" UNIQUE ("github_id"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_28f848317b29b550722635316e" ON "reviews" ("github_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c81f7959088efad7c2b929bde" ON "reviews" ("submitted_at_github") `);
        await queryRunner.query(`CREATE INDEX "IDX_3d86672cfbab4f77756335932e" ON "reviews" ("org_id") `);
        await queryRunner.query(`ALTER TABLE "repositories" ADD CONSTRAINT "FK_0817f53f8503847af03983f86b1" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commits" ADD CONSTRAINT "FK_4759d37320663b9004c71ccd71b" FOREIGN KEY ("author_id") REFERENCES "developers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commits" ADD CONSTRAINT "FK_4624df2cf1256e2b2185e2425a1" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pull_requests" ADD CONSTRAINT "FK_1f6a72928d27502b04aab35aed7" FOREIGN KEY ("author_id") REFERENCES "developers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pull_requests" ADD CONSTRAINT "FK_afbe4f3c2c7d28d55f9cb55ee72" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_92e950a2513a79bb3fab273c92e" FOREIGN KEY ("reviewer_id") REFERENCES "developers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_a652f08f460a1ac62abb172e478" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_a652f08f460a1ac62abb172e478"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_92e950a2513a79bb3fab273c92e"`);
        await queryRunner.query(`ALTER TABLE "pull_requests" DROP CONSTRAINT "FK_afbe4f3c2c7d28d55f9cb55ee72"`);
        await queryRunner.query(`ALTER TABLE "pull_requests" DROP CONSTRAINT "FK_1f6a72928d27502b04aab35aed7"`);
        await queryRunner.query(`ALTER TABLE "commits" DROP CONSTRAINT "FK_4624df2cf1256e2b2185e2425a1"`);
        await queryRunner.query(`ALTER TABLE "commits" DROP CONSTRAINT "FK_4759d37320663b9004c71ccd71b"`);
        await queryRunner.query(`ALTER TABLE "repositories" DROP CONSTRAINT "FK_0817f53f8503847af03983f86b1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d86672cfbab4f77756335932e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c81f7959088efad7c2b929bde"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_28f848317b29b550722635316e"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TYPE "public"."reviews_state_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b857ddc4fd4392133599b69bc6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_811a8874cdc8d7c6e4eb0b4fd4"`);
        await queryRunner.query(`DROP TABLE "developers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_815d5d24bf191fe55bb7603a38"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_48df8daebf8691ee0c79a1992d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b9ae237e2105d43675e15875a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b03d9988c25a41e70fd1ad9ad3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d257b7b59f5cc0bd9f6af96f18"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a24eae23bad88ac579cac8d9b"`);
        await queryRunner.query(`DROP TABLE "pull_requests"`);
        await queryRunner.query(`DROP TYPE "public"."pull_requests_state_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc4002cb4f157f38617deed20f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b14e9bf00d9ad5a35e5f764d2e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d802ca1c859d78633b6ac35aa"`);
        await queryRunner.query(`DROP TABLE "commits"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0817f53f8503847af03983f86b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2a6f4a6c8d66e871728356207"`);
        await queryRunner.query(`DROP TABLE "repositories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f02786e1e7abd8e19537e691ba"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23f15508c47693f3ead2d743d9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a175fed7de0c99c37d8cb277a6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_70597b4533496985f96871a14b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b169747fff621c89146688ccd"`);
        await queryRunner.query(`DROP TABLE "sync_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."sync_jobs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sync_jobs_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6ee70d1a9efe966b770ed12e47"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c18904d7a2c1aebbccab714e82"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d2625f04a09451b18c821f53f1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c1db1ec505a69c927e3c4dcee"`);
        await queryRunner.query(`DROP TABLE "webhook_deliveries"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_deliveries_status_enum"`);
    }

}
