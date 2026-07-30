-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DishCostEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dishId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "weight" REAL NOT NULL,
    "skewerCount" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "wasteExpired" INTEGER NOT NULL DEFAULT 0,
    "wasteStaff" INTEGER NOT NULL DEFAULT 0,
    "wasteGiveaway" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DishCostEntry_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DishCostEntry" ("createdAt", "date", "dishId", "id", "notes", "skewerCount", "totalCost", "unitCost", "updatedAt", "weight") SELECT "createdAt", "date", "dishId", "id", "notes", "skewerCount", "totalCost", "unitCost", "updatedAt", "weight" FROM "DishCostEntry";
DROP TABLE "DishCostEntry";
ALTER TABLE "new_DishCostEntry" RENAME TO "DishCostEntry";
CREATE UNIQUE INDEX "DishCostEntry_dishId_date_key" ON "DishCostEntry"("dishId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
