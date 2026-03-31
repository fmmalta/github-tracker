import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGithubCreatedAtToRepositories1775001000000 implements MigrationInterface {
    name = 'AddGithubCreatedAtToRepositories1775001000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repositories" ADD "github_created_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repositories" DROP COLUMN "github_created_at"`);
    }
}
