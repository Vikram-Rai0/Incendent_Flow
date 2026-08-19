import { Request, Response } from "express";
import { registerSchema } from "./auth.schemas";
import { registerUser } from "./auth.service";

import { loginSchema } from "./auth.schemas";
import { loginUser } from "./auth.service";

import { refreshAccessToken, logoutUser } from "./auth.service";
import { verifyRefreshToken } from "./tokens";

export async function registerHandler(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { email, password, name } = parsed.data;
  const result = await registerUser(email, password, name);

  if (result.outcome === "conflict") {
    return res
      .status(409)
      .json({ error: "An account with this email already exists" });
  }

  // Never send passwordHash back, even hashed
  const { passwordHash, ...safeUser } = result.user;
  return res.status(201).json({ user: safeUser });
}

//  login
export async function loginHandler(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const result = await loginUser(email, password);

  if (result.outcome === "invalid") {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Refresh token goes in an httpOnly cookie - never accessible to JS, never in the JSON body
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const { passwordHash, ...safeUser } = result.user;
  return res
    .status(200)
    .json({ accessToken: result.accessToken, user: safeUser });
}




export async function refreshHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token" });
  }

  const result = await refreshAccessToken(refreshToken);

  if (result.outcome === "invalid") {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const { passwordHash, ...safeUser } = result.user;
  return res.status(200).json({ accessToken: result.accessToken, user: safeUser });
}

export async function logoutHandler(req: Request, res: Response) {
  // Bump tokenVersion — invalidates all existing access tokens
  if (req.user?.id) {
    await logoutUser(req.user.id);
  }

  // Clear the refresh cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Logged out" });
}