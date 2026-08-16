import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";

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