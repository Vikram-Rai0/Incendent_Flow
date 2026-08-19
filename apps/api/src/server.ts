import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { claimTaskHandler } from "./modules/tasks/tasks.controller";
import { registerHandler, loginHandler ,refreshHandler, logoutHandler} from "./modules/auth/auth.controller";
import { requireAuth } from "./middleware/auth.middleware";
import { prisma } from "./db/prisma";



dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

app.post("/auth/register", registerHandler);
app.post("/auth/login", loginHandler);
app.post("/tasks/:taskId/claim", requireAuth, claimTaskHandler);
app.post("/auth/refresh", refreshHandler);
app.post("/auth/logout", requireAuth, logoutHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Api listening on port ${PORT}`);
});



export async function logoutUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}