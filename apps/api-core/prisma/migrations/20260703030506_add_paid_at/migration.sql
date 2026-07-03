-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "pickupCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "orderType" TEXT NOT NULL DEFAULT 'dine-in',
    "merchantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "originalAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "payableAmount" REAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelReason" TEXT,
    "cancelledAt" DATETIME,
    "paidAt" DATETIME,
    CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("branchId", "cancelReason", "cancelledAt", "createdAt", "deviceId", "discountAmount", "id", "merchantId", "orderNo", "orderType", "originalAmount", "payableAmount", "pickupCode", "status", "updatedAt") SELECT "branchId", "cancelReason", "cancelledAt", "createdAt", "deviceId", "discountAmount", "id", "merchantId", "orderNo", "orderType", "originalAmount", "payableAmount", "pickupCode", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
