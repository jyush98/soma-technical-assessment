-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Todo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "imageLoading" BOOLEAN NOT NULL DEFAULT false,
    "lastImageSearch" TEXT,
    "estimatedDays" INTEGER DEFAULT 1,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "earliestStartDate" DATETIME,
    "isOnCriticalPath" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Todo" ("actualEndDate", "actualStartDate", "createdAt", "dueDate", "earliestStartDate", "estimatedDays", "id", "imageAlt", "imageLoading", "imageUrl", "isOnCriticalPath", "lastImageSearch", "title", "updatedAt") SELECT "actualEndDate", "actualStartDate", "createdAt", "dueDate", "earliestStartDate", "estimatedDays", "id", "imageAlt", "imageLoading", "imageUrl", "isOnCriticalPath", "lastImageSearch", "title", "updatedAt" FROM "Todo";
DROP TABLE "Todo";
ALTER TABLE "new_Todo" RENAME TO "Todo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
