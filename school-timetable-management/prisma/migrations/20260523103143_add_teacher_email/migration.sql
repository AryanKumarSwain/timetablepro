-- CreateTable
CREATE TABLE `SaaSPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `teacherMin` INTEGER NOT NULL,
    `teacherMax` INTEGER NOT NULL,
    `priceMonthly` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `School` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `licenseStatus` ENUM('ACTIVE', 'SUSPENDED', 'TRAIL_EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `planId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'TEACHER') NOT NULL,
    `schoolId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Teacher` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `maxPeriodsPerWeek` INTEGER NOT NULL DEFAULT 24,
    `subjectSpecialtyId` VARCHAR(191) NOT NULL,

    INDEX `Teacher_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subject` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,

    INDEX `Subject_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassRoom` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `roomNumber` VARCHAR(191) NOT NULL,

    INDEX `ClassRoom_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Period` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `periodNumber` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,

    INDEX `Period_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyTimetableSlot` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,

    INDEX `WeeklyTimetableSlot_schoolId_idx`(`schoolId`),
    INDEX `WeeklyTimetableSlot_dayOfWeek_periodId_classId_idx`(`dayOfWeek`, `periodId`, `classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeacherAttendance` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT') NOT NULL,

    INDEX `TeacherAttendance_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `TeacherAttendance_teacherId_date_key`(`teacherId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReplacementAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `originalTeacherId` VARCHAR(191) NOT NULL,
    `replacementTeacherId` VARCHAR(191) NOT NULL,
    `reason` ENUM('CASUAL_LEAVE', 'MEDICAL_LEAVE', 'OTHER_DUTY') NOT NULL DEFAULT 'CASUAL_LEAVE',
    `status` ENUM('PENDING', 'CONFIRMED') NOT NULL DEFAULT 'PENDING',

    INDEX `ReplacementAssignment_schoolId_idx`(`schoolId`),
    INDEX `ReplacementAssignment_date_periodId_classId_idx`(`date`, `periodId`, `classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `School` ADD CONSTRAINT `School_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SaaSPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Teacher` ADD CONSTRAINT `Teacher_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subject` ADD CONSTRAINT `Subject_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassRoom` ADD CONSTRAINT `ClassRoom_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Period` ADD CONSTRAINT `Period_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyTimetableSlot` ADD CONSTRAINT `WeeklyTimetableSlot_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyTimetableSlot` ADD CONSTRAINT `WeeklyTimetableSlot_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `Period`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyTimetableSlot` ADD CONSTRAINT `WeeklyTimetableSlot_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `ClassRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyTimetableSlot` ADD CONSTRAINT `WeeklyTimetableSlot_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyTimetableSlot` ADD CONSTRAINT `WeeklyTimetableSlot_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherAttendance` ADD CONSTRAINT `TeacherAttendance_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherAttendance` ADD CONSTRAINT `TeacherAttendance_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplacementAssignment` ADD CONSTRAINT `ReplacementAssignment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplacementAssignment` ADD CONSTRAINT `ReplacementAssignment_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `Period`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplacementAssignment` ADD CONSTRAINT `ReplacementAssignment_originalTeacherId_fkey` FOREIGN KEY (`originalTeacherId`) REFERENCES `Teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplacementAssignment` ADD CONSTRAINT `ReplacementAssignment_replacementTeacherId_fkey` FOREIGN KEY (`replacementTeacherId`) REFERENCES `Teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
