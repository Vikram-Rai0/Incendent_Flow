-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "resolutionNote" TEXT;

-- CreateIndex
CREATE INDEX "Comment_incidentId_idx" ON "Comment"("incidentId");

-- CreateIndex
CREATE INDEX "Decision_incidentId_idx" ON "Decision"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentResponder_userId_idx" ON "IncidentResponder"("userId");

-- CreateIndex
CREATE INDEX "Task_incidentId_idx" ON "Task"("incidentId");

-- CreateIndex
CREATE INDEX "TimelineEvent_incidentId_createdAt_idx" ON "TimelineEvent"("incidentId", "createdAt");
