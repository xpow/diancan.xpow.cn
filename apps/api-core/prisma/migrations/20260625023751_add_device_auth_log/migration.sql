-- CreateTable
CREATE TABLE "DeviceAuthLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceAuthLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeviceAuthLog_deviceId_idx" ON "DeviceAuthLog"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAuthLog_uuid_idx" ON "DeviceAuthLog"("uuid");
