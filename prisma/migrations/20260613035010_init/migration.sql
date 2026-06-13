-- CreateTable
CREATE TABLE "download_record" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "assetName" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "gameVersion" TEXT NOT NULL,
    "opanelVersion" TEXT NOT NULL,

    CONSTRAINT "download_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "download_record_day_idx" ON "download_record"("day");

-- CreateIndex
CREATE INDEX "download_record_createdAt_idx" ON "download_record"("createdAt");
