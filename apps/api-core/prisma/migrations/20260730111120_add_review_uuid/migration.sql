-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL DEFAULT '',
    "comment" TEXT,
    "rewardDishId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Review" ("branchId", "comment", "createdAt", "deviceId", "id", "rewardDishId") SELECT "branchId", "comment", "createdAt", "deviceId", "id", "rewardDishId" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE INDEX "Review_deviceId_idx" ON "Review"("deviceId");
CREATE INDEX "Review_uuid_idx" ON "Review"("uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
