-- AlterTable
ALTER TABLE "users" ADD COLUMN "displayName" TEXT;
ALTER TABLE "users" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Accounts created before email verification existed already own their mailbox
-- in practice; without this backfill they would be locked out of sign-in.
UPDATE "users" SET "emailVerified" = true;

-- CreateTable
CREATE TABLE "profile_images" (
    "userId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_images_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "profile_images" ADD CONSTRAINT "profile_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
