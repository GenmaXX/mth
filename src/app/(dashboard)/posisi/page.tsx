import { Suspense } from "react";
import { getPosisi, getDrivers, getAllCars } from "./actions";
import { PosisiClient } from "./posisi-client";

async function PosisiContent() {
  const [posisiRaw, driversRaw, carsRaw] = await Promise.all([
    getPosisi(),
    getDrivers(),
    getAllCars(),
  ]);

  const posisi = JSON.parse(JSON.stringify(posisiRaw));
  const drivers = JSON.parse(JSON.stringify(driversRaw));
  const cars = JSON.parse(JSON.stringify(carsRaw));

  return <PosisiClient initialPosisi={posisi} drivers={drivers} cars={cars} />;
}

export default function PosisiPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-lg border bg-white" />
        </div>
      }
    >
      <PosisiContent />
    </Suspense>
  );
}