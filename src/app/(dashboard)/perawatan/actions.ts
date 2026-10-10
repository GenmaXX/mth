"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type PerawatanRow = {
  id: string;
  tanggal: string;
  carId: string;
  platMobil: string;
  jenisMobil: string;
  bengkel: string;
  bank: string | null;
  namaPenerima: string | null;
  noRekening: string | null;
  isOli: boolean;
  isBan: boolean;
  isAki: boolean;
  isAc: boolean;
  isOr: boolean;
  isService: boolean;
  serviceGanti: string | null;
  oliNote: string | null;
  catatan: string | null;
  keterangan: string | null;
  kmSebelum: number | null;
  kmSesudah: number | null;
  sebelumUrl: string | null;
  sesudahUrl: string | null;
  nominal: number;
  createdAt: string;
};

export async function getPerawatan(): Promise<PerawatanRow[]> {
  const data = await prisma.maintenance.findMany({
    include: { car: true },
    orderBy: { tanggal: "desc" },
  });
  return data.map((m) => ({
    id: m.id,
    tanggal: m.tanggal.toISOString(),
    carId: m.carId,
    platMobil: m.car.platMobil,
    jenisMobil: m.car.jenisMobil,
    bengkel: m.bengkel,
    bank: m.bank,
    namaPenerima: m.namaPenerima,
    noRekening: m.noRekening,
isOli: m.isOli,
    isBan: m.isBan,
    isAki: m.isAki,
    isAc: m.isAc,
    isOr: m.isOr,
    isService: m.isService,
    serviceGanti: m.serviceGanti,
    oliNote: m.oliNote,
    catatan: m.catatan,
    keterangan: m.keterangan,
    kmSebelum: m.kmSebelum,
    kmSesudah: m.kmSesudah,
    sebelumUrl: m.sebelumUrl,
    sesudahUrl: m.sesudahUrl,
    nominal: Number(m.nominal),
    createdAt: m.createdAt.toISOString(),
  }));
}

export type CreatePerawatanInput = {
  tanggal: Date;
  carId: string;
  bengkel: string;
  bank?: string;
  namaPenerima?: string;
  noRekening?: string;
  isOli?: boolean;
  isBan?: boolean;
  isAki?: boolean;
  isAc?: boolean;
  isOr?: boolean;
  isService?: boolean;
  serviceGanti?: string;
  kmSebelum?: number;
  kmSesudah?: number;
  sebelumUrl?: string;
  sesudahUrl?: string;
  nominal: number;
};

export async function createPerawatan(data: CreatePerawatanInput) {
  await prisma.maintenance.create({
    data: {
      tanggal: data.tanggal,
      carId: data.carId,
      bengkel: data.bengkel,
      bank: data.bank ?? null,
      namaPenerima: data.namaPenerima ?? null,
      noRekening: data.noRekening ?? null,
      isOli: data.isOli ?? false,
      isBan: data.isBan ?? false,
      isAki: data.isAki ?? false,
      isAc: data.isAc ?? false,
      isOr: data.isOr ?? false,
      isService: data.isService ?? false,
      serviceGanti: data.serviceGanti ?? null,
      kmSebelum: data.kmSebelum ?? null,
      kmSesudah: data.kmSesudah ?? null,
      sebelumUrl: data.sebelumUrl ?? null,
      sesudahUrl: data.sesudahUrl ?? null,
      nominal: data.nominal,
    },
  });
  revalidatePath("/perawatan");
}

export async function updatePerawatan(id: string, data: CreatePerawatanInput) {
  await prisma.maintenance.update({
    where: { id },
    data: {
      tanggal: data.tanggal,
      carId: data.carId,
      bengkel: data.bengkel,
      bank: data.bank ?? null,
      namaPenerima: data.namaPenerima ?? null,
      noRekening: data.noRekening ?? null,
      isOli: data.isOli ?? false,
      isBan: data.isBan ?? false,
      isAki: data.isAki ?? false,
      isAc: data.isAc ?? false,
      isOr: data.isOr ?? false,
      isService: data.isService ?? false,
      serviceGanti: data.serviceGanti ?? null,
      kmSebelum: data.kmSebelum ?? null,
      kmSesudah: data.kmSesudah ?? null,
      sebelumUrl: data.sebelumUrl ?? null,
      sesudahUrl: data.sesudahUrl ?? null,
      nominal: data.nominal,
    },
  });
  revalidatePath("/perawatan");
}

export async function deletePerawatan(id: string) {
  await prisma.maintenance.delete({ where: { id } });
  revalidatePath("/perawatan");
}

export async function getAllCars() {
  return prisma.car.findMany({ orderBy: { platMobil: "asc" } });
}