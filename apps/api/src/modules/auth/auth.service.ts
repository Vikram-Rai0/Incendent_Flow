import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";
import { signAccessToken, signRefreshToken } from "./tokens";
import { verifyRefreshToken } from "./tokens";

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



// Receive refresh token
//         ↓
// Verify JWT
//         ↓
// Is token valid?
//    ↓             ↓
//   No            Yes
//    ↓             ↓
// invalid       Get user ID
//                   ↓
//              Find user
//                   ↓
//           Does user exist?
//             ↓          ↓
//            No         Yes
//             ↓          ↓
//          invalid   Compare tokenVersion
//                        ↓
//                 Does it match?
//                   ↓         ↓
//                  No        Yes
//                   ↓         ↓
//                invalid   Create new
//                          access token
//                             ↓
//                          success

export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return { outcome: "invalid" as const };
    }

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return { outcome: "success" as const, accessToken, user };
  } catch {
    return { outcome: "invalid" as const };
  }
}


export async function logoutUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}