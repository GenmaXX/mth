import { Suspense } from "react";
import { getPerawatan, getAllCars } from "./actions";
import { PerawatanClient } from "./perawatan-client";

async function PerawatanContent() {
  const [perawatanRaw, carsRaw] = await Promise.all([getPerawatan(), getAllCars()]);
  const perawatan = JSON.parse(JSON.stringify(perawatanRaw));
  const cars = JSON.parse(JSON.stringify(carsRaw));
  return <PerawatanClient initialPerawatan={perawatan} cars={cars} />;
}

export default function PerawatanPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-lg border bg-white" />
        </div>
      }
    >
      <PerawatanContent />
    </Suspense>
  );
}