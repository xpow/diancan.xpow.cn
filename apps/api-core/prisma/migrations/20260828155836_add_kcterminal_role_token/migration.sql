/*
  Warnings:

  - You are about to drop the column `addressCode` on the `KitchenTerminal` table. All the data in the column will be lost.
  - Added the required column `token` to the `KitchenTerminal` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KitchenTerminal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "token" TEXT NOT NULL,
    "categoryIds" TEXT NOT NULL DEFAULT '[]',
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KitchenTerminal_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_KitchenTerminal" ("categoryIds", "code", "createdAt", "id", "merchantId", "name", "status", "updatedAt") SELECT "categoryIds", "code", "createdAt", "id", "merchantId", "name", "status", "updatedAt" FROM "KitchenTerminal";
DROP TABLE "KitchenTerminal";
ALTER TABLE "new_KitchenTerminal" RENAME TO "KitchenTerminal";
CREATE UNIQUE INDEX "KitchenTerminal_token_key" ON "KitchenTerminal"("token");
CREATE INDEX "KitchenTerminal_merchantId_idx" ON "KitchenTerminal"("merchantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
