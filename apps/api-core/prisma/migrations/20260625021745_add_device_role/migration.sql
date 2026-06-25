-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "sn" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'kiosk',
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Device_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Device" ("branchId", "code", "contact", "createdAt", "id", "mode", "name", "sn", "status", "updatedAt") SELECT "branchId", "code", "contact", "createdAt", "id", "mode", "name", "sn", "status", "updatedAt" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
CREATE UNIQUE INDEX "Device_sn_key" ON "Device"("sn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
