/*
  Warnings:

  - Added the required column `slotId` to the `ReplacementAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `replacementassignment` ADD COLUMN `slotId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `teacher` MODIFY `subjectSpecialtyId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ReplacementAssignment` ADD CONSTRAINT `ReplacementAssignment_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `TimetableSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
