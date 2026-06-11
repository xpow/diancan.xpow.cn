-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "finalUnitPrice" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "finalSubtotal" REAL NOT NULL,
    "specs" TEXT,
    "promotionLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("createdAt", "dishId", "finalSubtotal", "finalUnitPrice", "id", "name", "orderId", "promotionLabel", "quantity", "specs", "subtotal", "unitPrice") SELECT "createdAt", "dishId", "finalSubtotal", "finalUnitPrice", "id", "name", "orderId", "promotionLabel", "quantity", "specs", "subtotal", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
