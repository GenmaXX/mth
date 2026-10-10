"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CarRow = {
  id: string;
  jenisMobil: string;
  transmisi: string;
  tahun: number;
  platMobil: string;
  masaBerlakuStnk: string | null;
  stnkUrl: string | null;
  hargaPerpanjangStnk: number;
  createdAt: string;
};

export async function getCars(): Promise<CarRow[]> {
  const cars = await prisma.car.findMany({
    orderBy: [
      { masaBerlakuStnk: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
  });
return cars.map((c) => ({
    id: c.id,
    jenisMobil: c.jenisMobil,
    transmisi: c.transmisi,
    tahun: c.tahun,
    platMobil: c.platMobil,
    masaBerlakuStnk: c.masaBerlakuStnk?.toISOString() ?? null,
    stnkUrl: c.stnkUrl,
    hargaPerpanjangStnk: Number(c.hargaPerpanjangStnk),
    createdAt: c.createdAt.toISOString(),
  }));
}

export type CreateCarInput = {
  jenisMobil: string;
  transmisi: string;
  tahun: number;
  platMobil: string;
  masaBerlakuStnk: Date | null;
  hargaPerpanjangStnk: number;
};

export async function createCar(data: CreateCarInput) {
  await prisma.car.create({
    data: {
      jenisMobil: data.jenisMobil,
      transmisi: data.transmisi,
      tahun: data.tahun,
      platMobil: data.platMobil.toUpperCase(),
      masaBerlakuStnk: data.masaBerlakuStnk,
      hargaPerpanjangStnk: data.hargaPerpanjangStnk,
    },
  });
  revalidatePath("/cars");
}

export async function updateCar(id: string, data: CreateCarInput) {
  await prisma.car.update({
    where: { id },
    data: {
      jenisMobil: data.jenisMobil,
      transmisi: data.transmisi,
      tahun: data.tahun,
      platMobil: data.platMobil.toUpperCase(),
      masaBerlakuStnk: data.masaBerlakuStnk,
      hargaPerpanjangStnk: data.hargaPerpanjangStnk,
    },
  });
  revalidatePath("/cars");
}

export async function deleteCar(id: string) {
  await prisma.car.delete({ where: { id } });
  revalidatePath("/cars");
}

export async function importCarsFromExcel(rows: CreateCarInput[]) {
  for (const row of rows) {
    await prisma.car.upsert({
      where: { platMobil: row.platMobil.toUpperCase() },
      update: {
        jenisMobil: row.jenisMobil,
        transmisi: row.transmisi,
        tahun: row.tahun,
        masaBerlakuStnk: row.masaBerlakuStnk,
        hargaPerpanjangStnk: row.hargaPerpanjangStnk,
      },
      create: {
        jenisMobil: row.jenisMobil,
        transmisi: row.transmisi,
        tahun: row.tahun,
        platMobil: row.platMobil.toUpperCase(),
        masaBerlakuStnk: row.masaBerlakuStnk,
        hargaPerpanjangStnk: row.hargaPerpanjangStnk,
      },
    });
  }
  revalidatePath("/cars");
}

export async function deleteAllCars() {
  await prisma.car.deleteMany();
  revalidatePath("/cars");
}

// === DETAIL ===
export type CarDetail = {
  id: string;
  platMobil: string;
  jenisMobil: string;
  transmisi: string;
  tahun: number;
  masaBerlakuStnk: Date | null;
  stnkUrl: string | null;
  hargaPerpanjangStnk: number;
  position: {
    userPosisi: string | null;
    driverName: string | null;
  } | null;
  maintenances: {
    id: string;
    tanggal: string;
    bengkel: string;
    bank: string | null;
    isOli: boolean;
    isBan: boolean;
    isAki: boolean;
    isAc: boolean;
    isOr: boolean;
    isService: boolean;
    serviceGanti: string | null;
    nominal: number;
    keterangan: string | null;
  }[];
  banOli: {
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
    tglAki: string | null;
    tglWiper: string | null;
    serviceLain: string | null;
    keterangan: string | null;
  } | null;
  etleViolations: {
    id: string;
    tanggalTilang: string | null;
    keterangan: string | null;
    lokasi: string | null;
    pelanggaran: string | null;
    nominalDenda: number;
    statusBayar: string;
    buktiUrl: string | null;
  }[];
};

export async function getCarDetail(id: string): Promise<CarDetail | null> {
  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      carPosition: { include: { driver: true } },
      maintenances: { orderBy: { createdAt: "desc" } },
      tireOilRecord: true,
      etleViolations: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!car) return null;

  return {
    id: car.id,
    platMobil: car.platMobil,
    jenisMobil: car.jenisMobil,
    transmisi: car.transmisi,
    tahun: car.tahun,
    masaBerlakuStnk: car.masaBerlakuStnk,
    stnkUrl: car.stnkUrl,
    hargaPerpanjangStnk: Number(car.hargaPerpanjangStnk),
    position: car.carPosition
      ? {
          userPosisi: car.carPosition.userPosisi,
          driverName: car.carPosition.driver?.namaSupir ?? null,
        }
      : null,
    maintenances: car.maintenances.map((m) => ({
      id: m.id,
      tanggal: m.tanggal.toISOString(),
      bengkel: m.bengkel,
      bank: m.bank,
      isOli: m.isOli,
      isBan: m.isBan,
      isAki: m.isAki,
      isAc: m.isAc,
      isOr: m.isOr,
      isService: m.isService,
      serviceGanti: m.serviceGanti,
      nominal: Number(m.nominal),
      keterangan: m.keterangan,
    })),
    banOli: car.tireOilRecord
      ? {
          driver: car.tireOilRecord.driver,
          kodeBanDKanan: car.tireOilRecord.kodeBanDKanan,
          tglBanDKanan: car.tireOilRecord.tglBanDKanan?.toISOString() ?? null,
          kodeBanDKiri: car.tireOilRecord.kodeBanDKiri,
          tglBanDKiri: car.tireOilRecord.tglBanDKiri?.toISOString() ?? null,
          kodeBanBKanan: car.tireOilRecord.kodeBanBKanan,
          tglBanBKanan: car.tireOilRecord.tglBanBKanan?.toISOString() ?? null,
          kodeBanBKiri: car.tireOilRecord.kodeBanBKiri,
          tglBanBKiri: car.tireOilRecord.tglBanBKiri?.toISOString() ?? null,
          kodeBanSerep: car.tireOilRecord.kodeBanSerep,
          tglBanSerep: car.tireOilRecord.tglBanSerep?.toISOString() ?? null,
          dongkrak: car.tireOilRecord.dongkrak,
          kunciRoda: car.tireOilRecord.kunciRoda,
          updateKm: car.tireOilRecord.updateKm,
          updateKmTgl: car.tireOilRecord.updateKmTgl?.toISOString() ?? null,
          kmKartuGantiOli: car.tireOilRecord.kmKartuGantiOli,
          tglAki: car.tireOilRecord.tglAki?.toISOString() ?? null,
          tglWiper: car.tireOilRecord.tglWiper?.toISOString() ?? null,
          serviceLain: car.tireOilRecord.serviceLain,
          keterangan: car.tireOilRecord.keterangan,
        }
      : null,
    etleViolations: car.etleViolations.map((v) => ({
      id: v.id,
      tanggalTilang: v.tanggalTilang?.toISOString() ?? null,
      keterangan: v.keterangan,
      lokasi: v.lokasi,
      pelanggaran: v.pelanggaran,
      nominalDenda: v.nominalDenda ?? 0,
      statusBayar: v.statusBayar,
      buktiUrl: v.buktiUrl,
    })),
  };
}

export async function updateStnkUrl(carId: string, url: string) {
  await prisma.car.update({
    where: { id: carId },
    data: { stnkUrl: url },
  });
  revalidatePath("/cars");
  revalidatePath("/cars/[id]");
}

// === TILANG ETLE ===
export async function upsertEtleViolation(data: {
  id?: string;
  carId: string;
  tanggalTilang: string | null;
  keterangan: string | null;
  lokasi: string | null;
  pelanggaran: string | null;
  nominalDenda: number;
  statusBayar: string;
}) {
  if (data.id) {
    await prisma.etleViolation.update({
      where: { id: data.id },
      data: {
        tanggalTilang: data.tanggalTilang ? new Date(data.tanggalTilang) : null,
        keterangan: data.keterangan,
        lokasi: data.lokasi,
        pelanggaran: data.pelanggaran,
        nominalDenda: data.nominalDenda,
        statusBayar: data.statusBayar,
      },
    });
  } else {
    await prisma.etleViolation.create({
      data: {
        carId: data.carId,
        tanggalTilang: data.tanggalTilang ? new Date(data.tanggalTilang) : null,
        keterangan: data.keterangan,
        lokasi: data.lokasi,
        pelanggaran: data.pelanggaran,
        nominalDenda: data.nominalDenda,
        statusBayar: data.statusBayar,
      },
    });
  }
  revalidatePath("/cars/[id]");
}

export async function deleteEtleViolation(id: string) {
  await prisma.etleViolation.delete({ where: { id } });
  revalidatePath("/cars/[id]");
}

export async function updateEtleBuktiUrl(violationId: string, url: string) {
  await prisma.etleViolation.update({
    where: { id: violationId },
    data: { buktiUrl: url },
  });
  revalidatePath("/cars/[id]");
}