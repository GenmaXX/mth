"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type BanOliRow = {
  id: string;
  carId: string;
  platMobil: string;
  jenisMobil: string;
  tahun: number;
  transmisi: string;
  tempatSupir: string | null;
  driver: string | null;
  kodeBanDKanan: string | null;
  tglBanDKanan: string | null;
  kodeBanDKiri: string | null;
  tglBanDKiri: string | null;
  kodeBanBKanan: string | null;
  tglBanBKanan: string | null;
  kodeBanBKiri: string | null;
  tglBanBKiri: string | null;
  kodeBanSerep: string | null;
  tglBanSerep: string | null;
  dongkrak: string | null;
  kunciRoda: string | null;
  updateKm: number | null;
  updateKmTgl: string | null;
  kmKartuGantiOli: string | null;
  tglKartuGantiOli: string | null;
  tglAki: string | null;
  tglWiper: string | null;
  tglServiceLain: string | null;
  serviceLain: string | null;
  keterangan: string | null;
};

const iso = (d: Date | null) => d?.toISOString() ?? null;

export async function getBanOli(): Promise<BanOliRow[]> {
  const data = await prisma.tireOilRecord.findMany({
    include: { car: true },
    orderBy: { updatedAt: "desc" },
  });
  return data.map((r) => ({
    id: r.id,
    carId: r.carId,
    platMobil: r.car.platMobil,
    jenisMobil: r.car.jenisMobil,
    tahun: r.car.tahun,
    transmisi: r.car.transmisi,
    tempatSupir: r.tempatSupir,
    driver: r.driver,
    kodeBanDKanan: r.kodeBanDKanan,
    tglBanDKanan: iso(r.tglBanDKanan),
    kodeBanDKiri: r.kodeBanDKiri,
    tglBanDKiri: iso(r.tglBanDKiri),
    kodeBanBKanan: r.kodeBanBKanan,
    tglBanBKanan: iso(r.tglBanBKanan),
    kodeBanBKiri: r.kodeBanBKiri,
    tglBanBKiri: iso(r.tglBanBKiri),
    kodeBanSerep: r.kodeBanSerep,
    tglBanSerep: iso(r.tglBanSerep),
    dongkrak: r.dongkrak,
    kunciRoda: r.kunciRoda,
    updateKm: r.updateKm,
    updateKmTgl: iso(r.updateKmTgl),
    kmKartuGantiOli: r.kmKartuGantiOli,
    tglKartuGantiOli: iso(r.tglKartuGantiOli),
    tglAki: iso(r.tglAki),
    tglWiper: iso(r.tglWiper),
    tglServiceLain: iso(r.tglServiceLain),
    serviceLain: r.serviceLain,
    keterangan: r.keterangan,
  }));
}

export async function getAllCars() {
  return prisma.car.findMany({ orderBy: { platMobil: "asc" } });
}

export type CreateBanOliInput = {
  carId: string;
  tempatSupir?: string;
  driver?: string;
  kodeBanDKanan?: string;
  tglBanDKanan?: Date;
  kodeBanDKiri?: string;
  tglBanDKiri?: Date;
  kodeBanBKanan?: string;
  tglBanBKanan?: Date;
  kodeBanBKiri?: string;
  tglBanBKiri?: Date;
  kodeBanSerep?: string;
  tglBanSerep?: Date;
  dongkrak?: string;
  kunciRoda?: string;
  updateKm?: number;
  updateKmTgl?: Date;
  kmKartuGantiOli?: string;
  tglKartuGantiOli?: Date;
  tglAki?: Date;
  tglWiper?: Date;
  tglServiceLain?: Date;
  serviceLain?: string;
  keterangan?: string;
};

function toTitleCase(s: string): string {
  if (!s) return "";
  return s.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function upsertBanOli(data: CreateBanOliInput) {
  const exists = await prisma.tireOilRecord.findUnique({ where: { carId: data.carId } });

  // Sync driver: cocokkan nama supir ke tabel Driver
  let driverId: string | null = null;
  if (data.driver) {
    const driverName = toTitleCase(data.driver);
    let driver = await prisma.driver.findFirst({ where: { namaSupir: driverName } });
    if (!driver) {
      const maxNo = await prisma.driver.findFirst({ orderBy: { noUrut: "desc" } });
      driver = await prisma.driver.create({
        data: { namaSupir: driverName, noUrut: (maxNo?.noUrut ?? 0) + 1 },
      });
    }
    driverId = driver.id;
  }

  const body = {
    tempatSupir: data.tempatSupir ?? null,
    driver: data.driver ?? null,
    kodeBanDKanan: data.kodeBanDKanan ?? null,
    tglBanDKanan: data.tglBanDKanan ?? null,
    kodeBanDKiri: data.kodeBanDKiri ?? null,
    tglBanDKiri: data.tglBanDKiri ?? null,
    kodeBanBKanan: data.kodeBanBKanan ?? null,
    tglBanBKanan: data.tglBanBKanan ?? null,
    kodeBanBKiri: data.kodeBanBKiri ?? null,
    tglBanBKiri: data.tglBanBKiri ?? null,
    kodeBanSerep: data.kodeBanSerep ?? null,
    tglBanSerep: data.tglBanSerep ?? null,
    dongkrak: data.dongkrak ?? null,
    kunciRoda: data.kunciRoda ?? null,
    updateKm: data.updateKm ?? null,
    updateKmTgl: data.updateKmTgl ?? null,
    kmKartuGantiOli: data.kmKartuGantiOli ?? null,
    tglKartuGantiOli: data.tglKartuGantiOli ?? null,
    tglAki: data.tglAki ?? null,
    tglWiper: data.tglWiper ?? null,
    tglServiceLain: data.tglServiceLain ?? null,
    serviceLain: data.serviceLain ?? null,
    keterangan: data.keterangan ?? null,
  };
  if (exists) {
    await prisma.tireOilRecord.update({ where: { carId: data.carId }, data: { ...body, driverId } });
  } else {
    await prisma.tireOilRecord.create({ data: { carId: data.carId, ...body, driverId } });
  }
  revalidatePath("/ban-oli");
  revalidatePath("/driver");
}

export async function deleteBanOli(id: string) {
  await prisma.tireOilRecord.delete({ where: { id } });
  revalidatePath("/ban-oli");
}