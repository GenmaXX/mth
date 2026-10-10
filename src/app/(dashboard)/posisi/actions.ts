"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type PosisiRow = {
  id: string;
  carId: string;
  platMobil: string;
  tahun: number;
  transmisi: string;
  jenisMobil: string;
  userPosisi: string | null;
  driverId: string | null;
  driverName: string | null;
  updatedAt: string | null;
};

export async function getPosisi(): Promise<PosisiRow[]> {
  const data = await prisma.carPosition.findMany({
    include: { car: true, driver: true },
    orderBy: { updatedAt: "desc" },
  });
  return data.map((p) => ({
    id: p.id,
    carId: p.carId,
    platMobil: p.car.platMobil,
    tahun: p.car.tahun,
    transmisi: p.car.transmisi,
    jenisMobil: p.car.jenisMobil,
    userPosisi: p.userPosisi,
    driverId: p.driverId,
    driverName: p.driver?.namaSupir ?? null,
    updatedAt: p.updatedAt.toISOString(),
  }));
}
export async function getDrivers() { return prisma.driver.findMany({ orderBy: { namaSupir: "asc" } }); }
export async function getAllCars() { return prisma.car.findMany({ orderBy: { platMobil: "asc" } }); }
export async function getCarsWithoutPosisi() {
  const has = await prisma.carPosition.findMany({ select: { carId: true } });
  return prisma.car.findMany({ where: { id: { notIn: has.map(c => c.carId) } }, orderBy: { platMobil: "asc" } });
}
export async function updatePosisiDetail(data: {
  carId: string;
  userPosisi?: string;
  driverId?: string;
  notes?: string;
}) {
  await prisma.carPosition.update({
    where: { carId: data.carId },
    data: {
      userPosisi: data.userPosisi ?? null,
      driverId: data.driverId ?? null,
    },
  });
  revalidatePath("/posisi");
}

export async function deletePosisi(carId: string) {
  await prisma.carPosition.delete({ where: { carId } });
  revalidatePath("/posisi");
}

export async function upsertPosisi(data: { carId: string; userPosisi?: string; driverId?: string }) {
  const exists = await prisma.carPosition.findUnique({ where: { carId: data.carId } });
  if (exists) {
    await prisma.carPosition.update({
      where: { carId: data.carId },
      data: { userPosisi: data.userPosisi ?? null, driverId: data.driverId ?? null },
    });
  } else {
    await prisma.carPosition.create({
      data: { carId: data.carId, userPosisi: data.userPosisi ?? null, driverId: data.driverId ?? null },
    });
  }
  revalidatePath("/posisi");
}