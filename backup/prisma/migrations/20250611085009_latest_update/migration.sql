/*
  Warnings:

  - You are about to drop the `FamilyMember` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `createdById` to the `FamilyNode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FamilyMember" DROP CONSTRAINT "FamilyMember_createdById_fkey";

-- DropForeignKey
ALTER TABLE "FamilyMember" DROP CONSTRAINT "FamilyMember_parentId_fkey";

-- DropForeignKey
ALTER TABLE "FamilyMember" DROP CONSTRAINT "FamilyMember_spouseId_fkey";

-- AlterTable
ALTER TABLE "FamilyNode" ADD COLUMN     "createdById" TEXT NOT NULL;

-- DropTable
DROP TABLE "FamilyMember";

-- AddForeignKey
ALTER TABLE "FamilyNode" ADD CONSTRAINT "FamilyNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
