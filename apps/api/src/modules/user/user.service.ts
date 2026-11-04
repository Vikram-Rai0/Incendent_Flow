import { prisma } from "../../db/prisma";

export async function getAllUsers(id: string) {
  if (!id) {
    return null;
  }

  const result = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  return result;
}