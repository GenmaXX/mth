import { Suspense } from "react";
import { getBanOli, getAllCars } from "./actions";
import { BanOliClient } from "./ban-oli-client";

async function BanOliContent() {
  const [dataRaw, carsRaw] = await Promise.all([getBanOli(), getAllCars()]);
  const data = JSON.parse(JSON.stringify(dataRaw));
  const cars = JSON.parse(JSON.stringify(carsRaw));
  return <BanOliClient initialData={data} cars={cars} />;
}

export default function BanOliPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-lg border bg-white" />
        </div>
      }
    >
      <BanOliContent />
    </Suspense>
  );
}