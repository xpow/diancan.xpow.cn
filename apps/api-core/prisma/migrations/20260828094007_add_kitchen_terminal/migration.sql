-- CreateTable
CREATE TABLE "KitchenTerminal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "addressCode" TEXT NOT NULL,
    "categoryIds" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KitchenTerminal_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenTerminal_addressCode_key" ON "KitchenTerminal"("addressCode");

-- CreateIndex
CREATE INDEX "KitchenTerminal_merchantId_idx" ON "KitchenTerminal"("merchantId");
