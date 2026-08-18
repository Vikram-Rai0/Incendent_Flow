import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";
import { signAccessToken, signRefreshToken } from "./tokens";

const SALT_ROUNDS = 12;

export async function registerUser(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { outcome: "conflict" as const };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: "RESPONDER" },
    });
    return { outcome: "created" as const, user };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") { //P2002 is prisma's unique constraint violation error code
      // Lost the rare race - the unique constraint caught what findUnique missed
      return { outcome: "conflict" as const };
    }
    throw err;
  }
}


export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { outcome: "invalid" as const };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { outcome: "invalid" as const };
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = signRefreshToken({
    userId: user.id,
    tokenVersion: user.tokenVersion,
  });

  return { outcome: "success" as const, accessToken, refreshToken, user };
}