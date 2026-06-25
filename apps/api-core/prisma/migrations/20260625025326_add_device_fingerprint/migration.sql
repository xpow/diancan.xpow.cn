-- CreateTable
CREATE TABLE "DeviceFingerprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "lastSeenDate" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeviceFingerprint_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeviceFingerprint_uuid_idx" ON "DeviceFingerprint"("uuid");

-- CreateIndex
CREATE INDEX "DeviceFingerprint_lastSeenDate_idx" ON "DeviceFingerprint"("lastSeenDate");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceFingerprint_deviceId_uuid_key" ON "DeviceFingerprint"("deviceId", "uuid");
