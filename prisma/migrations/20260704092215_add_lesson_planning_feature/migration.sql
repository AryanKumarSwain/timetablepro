-- AlterTable
ALTER TABLE `saasplan` ADD COLUMN `lessonPlanningEnabled` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `TeacherAbsentRequest` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `schoolId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeacherAbsentRequest_teacherId_idx`(`teacherId`),
    INDEX `TeacherAbsentRequest_schoolId_idx`(`schoolId`),
    INDEX `TeacherAbsentRequest_date_status_idx`(`date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeacherTodo` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NULL,
    `classId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeacherTodo_schoolId_idx`(`schoolId`),
    INDEX `TeacherTodo_teacherId_idx`(`teacherId`),
    INDEX `TeacherTodo_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LessonPlan` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `slotId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `planDate` VARCHAR(191) NOT NULL,
    `lessonTitle` VARCHAR(191) NOT NULL,
    `topic` VARCHAR(191) NULL,
    `chapter` VARCHAR(191) NULL,
    `subtopic` VARCHAR(191) NULL,
    `learningObjectives` TEXT NULL,
    `teachingMethod` VARCHAR(191) NULL,
    `teachingAids` TEXT NULL,
    `activities` TEXT NULL,
    `homework` TEXT NULL,
    `assessmentMethod` VARCHAR(191) NULL,
    `learningOutcomes` TEXT NULL,
    `notes` TEXT NULL,
    `estimatedDuration` INTEGER NULL,
    `status` ENUM('DRAFT', 'PLANNED', 'COMPLETED', 'SKIPPED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LessonPlan_schoolId_idx`(`schoolId`),
    INDEX `LessonPlan_teacherId_idx`(`teacherId`),
    INDEX `LessonPlan_classId_idx`(`classId`),
    INDEX `LessonPlan_subjectId_idx`(`subjectId`),
    INDEX `LessonPlan_planDate_idx`(`planDate`),
    INDEX `LessonPlan_status_idx`(`status`),
    UNIQUE INDEX `LessonPlan_slotId_planDate_key`(`slotId`, `planDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LessonAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `lessonPlanId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LessonAttachment_lessonPlanId_idx`(`lessonPlanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LessonPlanComment` (
    `id` VARCHAR(191) NOT NULL,
    `lessonPlanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LessonPlanComment_lessonPlanId_idx`(`lessonPlanId`),
    INDEX `LessonPlanComment_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeacherAbsentRequest` ADD CONSTRAINT `TeacherAbsentRequest_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherAbsentRequest` ADD CONSTRAINT `TeacherAbsentRequest_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherTodo` ADD CONSTRAINT `TeacherTodo_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherTodo` ADD CONSTRAINT `TeacherTodo_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `TimetableSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `ClassRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `Period`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonAttachment` ADD CONSTRAINT `LessonAttachment_lessonPlanId_fkey` FOREIGN KEY (`lessonPlanId`) REFERENCES `LessonPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlanComment` ADD CONSTRAINT `LessonPlanComment_lessonPlanId_fkey` FOREIGN KEY (`lessonPlanId`) REFERENCES `LessonPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlanComment` ADD CONSTRAINT `LessonPlanComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
