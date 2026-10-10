-- CreateTable
CREATE TABLE "WaiveEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "orderId" TEXT,
    "groupId" TEXT,
    "merchantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "WaiveEntry_orderId_idx" ON "WaiveEntry"("orderId");
CREATE INDEX "WaiveEntry_groupId_idx" ON "WaiveEntry"("groupId");
CREATE INDEX "WaiveEntry_waivedAt_idx" ON "WaiveEntry"("waivedAt");
CREATE INDEX "WaiveEntry_createdAt_idx" ON "WaiveEntry"("createdAt");