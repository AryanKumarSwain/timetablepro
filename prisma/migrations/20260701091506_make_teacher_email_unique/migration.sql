/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `school` DROP FOREIGN KEY `School_planId_fkey`;

-- DropIndex
DROP INDEX `School_planId_fkey` ON `school`;

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `targetUserId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `replacementassignment` MODIFY `slotId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `reportentry` ADD COLUMN `isProxy` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `saasplan` ADD COLUMN `attendanceEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `exportFormats` JSON NOT NULL,
    ADD COLUMN `homeworkEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `reportEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `watermarkRequired` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `school` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `hasNotifiedTrialEnding` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hasUsedTrial` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `logo` VARCHAR(191) NULL,
    ADD COLUMN `originalPlanId` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `planEndsAt` DATETIME(3) NULL,
    ADD COLUMN `planStartsAt` DATETIME(3) NULL,
    ADD COLUMN `queuedPlanId` VARCHAR(191) NULL,
    ADD COLUMN `queuedPlanStartsAt` DATETIME(3) NULL,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
    ADD COLUMN `trialPlanId` VARCHAR(191) NULL,
    ADD COLUMN `trialStatus` ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'NONE',
    MODIFY `licenseStatus` ENUM('ACTIVE', 'SUSPENDED', 'TRIAL', 'TRAIL_EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    MODIFY `planId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `teacher` ADD COLUMN `leaveRequestStatus` ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NONE',
    MODIFY `schoolId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TrialRequest` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `schoolName` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `expectedFaculty` INTEGER NOT NULL,
    `planId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Homework` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SENT_TO_ADMIN') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Homework_schoolId_idx`(`schoolId`),
    INDEX `Homework_teacherId_idx`(`teacherId`),
    INDEX `Homework_classId_idx`(`classId`),
    INDEX `Homework_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SchoolLeaveRequest` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `status` ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reason` TEXT NULL,

    INDEX `SchoolLeaveRequest_schoolId_idx`(`schoolId`),
    INDEX `SchoolLeaveRequest_teacherId_idx`(`teacherId`),
    INDEX `SchoolLeaveRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformSettings` (
    `id` VARCHAR(191) NOT NULL,
    `upiId` VARCHAR(191) NULL DEFAULT 'example@upi',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `billingCycle` VARCHAR(191) NOT NULL,
    `utrNumber` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `couponId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SubscriptionTransaction_schoolId_idx`(`schoolId`),
    INDEX `SubscriptionTransaction_status_idx`(`status`),
    INDEX `SubscriptionTransaction_couponId_idx`(`couponId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomPlanRequest` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `requestedFacultyLimit` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomPlanRequest_schoolId_idx`(`schoolId`),
    INDEX `CustomPlanRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `discountPercent` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `maxUses` INTEGER NULL,
    `currentUses` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Coupon_code_key`(`code`),
    INDEX `Coupon_code_idx`(`code`),
    INDEX `Coupon_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_targetUserId_idx` ON `Notification`(`targetUserId`);

-- CreateIndex
CREATE UNIQUE INDEX `Teacher_email_key` ON `Teacher`(`email`);

-- AddForeignKey
ALTER TABLE `School` ADD CONSTRAINT `School_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SaaSPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `School` ADD CONSTRAINT `School_queuedPlanId_fkey` FOREIGN KEY (`queuedPlanId`) REFERENCES `SaaSPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `School` ADD CONSTRAINT `School_trialPlanId_fkey` FOREIGN KEY (`trialPlanId`) REFERENCES `SaaSPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `School` ADD CONSTRAINT `School_originalPlanId_fkey` FOREIGN KEY (`originalPlanId`) REFERENCES `SaaSPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Homework` ADD CONSTRAINT `Homework_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Homework` ADD CONSTRAINT `Homework_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Homework` ADD CONSTRAINT `Homework_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `ClassRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchoolLeaveRequest` ADD CONSTRAINT `SchoolLeaveRequest_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchoolLeaveRequest` ADD CONSTRAINT `SchoolLeaveRequest_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionTransaction` ADD CONSTRAINT `SubscriptionTransaction_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionTransaction` ADD CONSTRAINT `SubscriptionTransaction_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomPlanRequest` ADD CONSTRAINT `CustomPlanRequest_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
