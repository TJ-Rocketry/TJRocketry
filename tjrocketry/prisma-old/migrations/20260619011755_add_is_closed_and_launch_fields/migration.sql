/*
  Warnings:

  - You are about to drop the column `description` on the `LaunchEvent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AttendanceBlock" ADD COLUMN     "isClosed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LaunchEvent" DROP COLUMN "description",
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "startTime" TEXT;
