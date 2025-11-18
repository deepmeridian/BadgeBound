import { prisma } from "../config/prisma";

export async function listProtocols() {
  return prisma.protocol.findMany({
    orderBy: { id: "asc" },
  });
}

export async function getProtocolByIdOrSlug(idOrSlug: string) {
  const idNum = Number(idOrSlug);

  if (!Number.isNaN(idNum)) {
    return prisma.protocol.findUnique({
      where: { id: idNum },
    });
  }

  return prisma.protocol.findUnique({
    where: { slug: idOrSlug },
  });
}

type CreateProtocolInput = {
  slug: string;
  name: string;
  logoUrl?: string | null;
  config?: any;
};

export async function createProtocol(input: CreateProtocolInput) {
  const slug = input.slug.toLowerCase().trim();

  return prisma.protocol.create({
    data: {
      slug,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      config: input.config ?? null,
    },
  });
}

type UpdateProtocolInput = {
  name?: string;
  logoUrl?: string | null;
  config?: any;
};

export async function updateProtocol(id: number, input: UpdateProtocolInput) {
  return prisma.protocol.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
    },
  });
}

export async function deleteProtocol(id: number) {
  return prisma.protocol.delete({
    where: { id },
  });
}
