"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type DriverRow = {
  id: string;
  noUrut: number | null;
  namaSupir: string;
  tanggalGajian: number | null;
  gajiPokok: number;
  jenisMobil: string | null;
  platMobil: string | null;
  posisi: string | null;
};

export async function getDrivers(): Promise<DriverRow[]> {
  const data = await prisma.driver.findMany({
    include: { carPositions: { include: { car: true } } },
    orderBy: { namaSupir: "asc" },
  });
  return data.map((d) => ({
    id: d.id,
    noUrut: d.noUrut,
    namaSupir: d.namaSupir,
    tanggalGajian: d.tanggalGajian,
    gajiPokok: Number(d.gajiPokok),
    jenisMobil: d.carPositions[0]?.car?.jenisMobil ?? null,
    platMobil: d.carPositions[0]?.car?.platMobil ?? null,
    posisi: d.carPositions[0]?.userPosisi ?? null,
  }));
}

export async function createDriver(data: { namaSupir: string; noUrut?: number; tanggalGajian?: number; gajiPokok?: number }) {
  await prisma.driver.create({ data: { namaSupir: data.namaSupir, noUrut: data.noUrut ?? null, tanggalGajian: data.tanggalGajian ?? null, gajiPokok: data.gajiPokok ?? 0 } });
  revalidatePath("/driver");
}
export async function updateDriver(id: string, data: { namaSupir: string; noUrut?: number; tanggalGajian?: number; gajiPokok?: number }) {
  await prisma.driver.update({ where: { id }, data: { namaSupir: data.namaSupir, noUrut: data.noUrut ?? null, tanggalGajian: data.tanggalGajian ?? null, gajiPokok: data.gajiPokok ?? 0 } });
  revalidatePath("/driver");
}
export async function deleteDriver(id: string) {
  await prisma.driver.delete({ where: { id } });
  revalidatePath("/driver");
}