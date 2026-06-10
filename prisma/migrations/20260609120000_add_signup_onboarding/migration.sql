-- AlterTable
ALTER TABLE `School` ADD COLUMN `type` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `studentsRange` VARCHAR(191) NULL,
    ADD COLUMN `facultyRange` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `password` VARCHAR(191) NULL,
    ADD COLUMN `countryCode` VARCHAR(191) NULL,
    ADD COLUMN `onboardingDone` BOOLEAN NOT NULL DEFAULT false;
