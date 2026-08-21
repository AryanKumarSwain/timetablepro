/*
  Warnings:

  - The values [RESUBMIT_REQUESTED] on the enum `DailyReport_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `dailyreport` MODIFY `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `school` ADD COLUMN `pausedPlanId` VARCHAR(191) NULL,
    ADD COLUMN `pausedPlanRemainingSeconds` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `School` ADD CONSTRAINT `School_pausedPlanId_fkey` FOREIGN KEY (`pausedPlanId`) REFERENCES `SaaSPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
