-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RESPONDER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('DETECTED', 'ACKNOWLEDGED', 'INVESTIGATING', 'IDENTIFIED', 'MITIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('SEV1', 'SEV2', 'SEV3', 'SEV4');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('UNCLAIMED', 'CLAIMED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RESPONDER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'DETECTED',
    "commanderId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentResponder" (
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "IncidentResponder_pkey" PRIMARY KEY ("incidentId","userId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "madeBy" TEXT NOT NULL,
    "decisionText" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
