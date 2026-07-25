-- AlterTable
ALTER TABLE `reportentry` ADD COLUMN `activityCategory` TEXT NULL,
    ADD COLUMN `activityDescription` TEXT NULL,
    ADD COLUMN `entryType` ENUM('LESSON', 'ACTIVITY') NOT NULL DEFAULT 'LESSON',
    ADD COLUMN `evidenceFiles` JSON NULL,
    ADD COLUMN `learningOutcome` TEXT NULL;

-- CreateIndex
CREATE INDEX `ReportEntry_entryType_idx` ON `ReportEntry`(`entryType`);
