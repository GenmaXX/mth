import { Suspense } from "react";
import { getDrivers } from "./actions";
import { DriverClient } from "./driver-client";

async function DriverContent() {
  const driversRaw = await getDrivers();
  const drivers = JSON.parse(JSON.stringify(driversRaw));
  return <DriverClient initialDrivers={drivers} />;
}

export default function DriverPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-lg border bg-white" />
        </div>
      }
    >
      <DriverContent />
    </Suspense>
  );
}