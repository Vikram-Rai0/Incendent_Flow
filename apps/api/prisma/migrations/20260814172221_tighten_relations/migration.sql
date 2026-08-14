-- AddForeignKey
ALTER TABLE "IncidentResponder" ADD CONSTRAINT "IncidentResponder_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
