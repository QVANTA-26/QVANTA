-- CreateEnum
CREATE TYPE "CheckpointState" AS ENUM ('not_started', 'in_progress', 'passed', 'failed');

-- CreateEnum
CREATE TYPE "CheckpointKind" AS ENUM ('checklist', 'quiz');

-- Extend per-user lesson progress with resumable learning state.
ALTER TABLE "user_progress"
    ADD COLUMN "lastStep" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "mastery" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "checkpointState" "CheckpointState" NOT NULL DEFAULT 'not_started',
    ADD COLUMN "checkpointScore" INTEGER,
    ADD COLUMN "checkpointAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "user_progress" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Source-backed checkpoints are reusable by every learner, while attempts are
-- always stored against the authenticated user.
CREATE TABLE "lesson_checkpoints" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "kind" "CheckpointKind" NOT NULL DEFAULT 'checklist',
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "source" TEXT NOT NULL DEFAULT 'course_module',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lesson_checkpoint_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_checkpoint_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_checkpoints_moduleId_source_key" ON "lesson_checkpoints"("moduleId", "source");

-- CreateIndex
CREATE INDEX "lesson_checkpoints_moduleId_idx" ON "lesson_checkpoints"("moduleId");

-- CreateIndex
CREATE INDEX "lesson_checkpoint_attempts_userId_checkpointId_idx" ON "lesson_checkpoint_attempts"("userId", "checkpointId");

-- AddForeignKey
ALTER TABLE "lesson_checkpoints" ADD CONSTRAINT "lesson_checkpoints_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_checkpoint_attempts" ADD CONSTRAINT "lesson_checkpoint_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_checkpoint_attempts" ADD CONSTRAINT "lesson_checkpoint_attempts_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "lesson_checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
