import { Suspense } from "react";
import { getCarDetail } from "../actions";
import { CarDetailClient } from "./car-detail-client";

async function CarDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCarDetail(id);
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-slate-600">Kendaraan tidak ditemukan</p>
        <a href="/cars" className="mt-2 text-sm text-indigo-600 hover:underline">← Kembali ke Armada</a>
      </div>
    );
  }
  return <CarDetailClient data={data} />;
}

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-48 animate-pulse rounded-lg border bg-white" />
          <div className="h-64 animate-pulse rounded-lg border bg-white" />
        </div>
      }
    >
      <CarDetailContent params={params} />
    </Suspense>
  );
}