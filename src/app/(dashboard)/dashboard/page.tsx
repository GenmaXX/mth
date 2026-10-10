import { Car, Users, Wrench, Receipt } from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Total Armada", value: "48", icon: Car, href: "/cars", color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Driver Aktif", value: "36", icon: Users, href: "/drivers", color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Service Due", value: "12", icon: Wrench, href: "/maintenance", color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Invoice Open", value: "Rp 1.2M", icon: Receipt, href: "/invoices", color: "text-rose-600", bg: "bg-rose-50" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Selamat datang di MTH Fleet ERP System
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Aktivitas Terbaru</h3>
          <div className="space-y-3">
            {[
              { text: "UJ Log #1023 - B 1234 XYZ completed", time: "2 menit lalu" },
              { text: "Service reminder untuk Honda CR-V", time: "1 jam lalu" },
              { text: "Invoice #INV-0456 telah dibayar", time: "3 jam lalu" },
              { text: "Driver baru: Bambang Santoso", time: "5 jam lalu" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-slate-700">{item.text}</span>
                <span className="text-xs text-slate-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Pengingat</h3>
          <div className="space-y-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-800">
              Perpanjang STNK 5 unit bulan ini
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">
              Pembayaran leasing jatuh tempo 3 hari
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}