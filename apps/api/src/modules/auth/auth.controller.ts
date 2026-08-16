import { Request, Response } from "express";
import { registerSchema } from "./auth.schemas";
import { registerUser } from "./auth.service";

export async function registerHandler(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { email, password, name } = parsed.data;
  const result = await registerUser(email, password, name);

  if (result.outcome === "conflict") {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  // Never send passwordHash back, even hashed
  const { passwordHash, ...safeUser } = result.user;
  return res.status(201).json({ user: safeUser });
}