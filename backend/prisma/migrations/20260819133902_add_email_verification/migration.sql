/*
  Warnings:

  - You are about to drop the column `tokenHash` on the `EmailVerificationToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenId]` on the table `EmailVerificationToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hashedSecret` to the `EmailVerificationToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenId` to the `EmailVerificationToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EmailVerificationToken_email_idx";

-- AlterTable
ALTER TABLE "EmailVerificationToken" DROP COLUMN "tokenHash",
ADD COLUMN     "hashedSecret" TEXT NOT NULL,
ADD COLUMN     "tokenId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenId_key" ON "EmailVerificationToken"("tokenId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_tokenId_idx" ON "EmailVerificationToken"("tokenId");
