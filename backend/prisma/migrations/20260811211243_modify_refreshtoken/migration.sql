/*
  Warnings:

  - You are about to drop the column `hashedToken` on the `RefreshToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenId]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hashedSecret` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "hashedToken",
ADD COLUMN     "hashedSecret" TEXT NOT NULL,
ADD COLUMN     "tokenId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenId_key" ON "RefreshToken"("tokenId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
