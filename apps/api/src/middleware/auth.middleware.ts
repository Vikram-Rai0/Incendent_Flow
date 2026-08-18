import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../modules/auth/tokens";
import { prisma } from "../db/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);

    // Check tokenVersion against the current DB value - this is the
    // actual revocation mechanism. If it doesn't match, the token was
    // valid at issue time but has since been invalidated (logout-everywhere,
    // role change, etc).
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: "Session no longer valid" });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}