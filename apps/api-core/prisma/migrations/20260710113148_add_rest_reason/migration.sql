-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slogan" TEXT NOT NULL DEFAULT '',
    "businessHours" TEXT NOT NULL DEFAULT '',
    "statusText" TEXT NOT NULL DEFAULT '营业中',
    "restReason" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "features" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Merchant" ("businessHours", "createdAt", "features", "id", "logoUrl", "name", "slogan", "statusText", "updatedAt") SELECT "businessHours", "createdAt", "features", "id", "logoUrl", "name", "slogan", "statusText", "updatedAt" FROM "Merchant";
DROP TABLE "Merchant";
ALTER TABLE "new_Merchant" RENAME TO "Merchant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
