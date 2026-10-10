"use client";

import {
  Bell,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  cars: "Armada",
  positions: "Posisi",
  drivers: "Driver",
  perawatan: "Perawatan",
  "tires-oil": "Ban & Oli",
  "ban-oli": "Ban & Oli",
  contracts: "Kontrak",
  leasing: "Leasing",
  insurance: "Asuransi",
  "driver-logs": "Log UJ",
  invoices: "Invoice",
};

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.length
    ? segments.map((s) => routeLabels[s] ?? "Detail Armada")
    : ["Dashboard"];

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "AD";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={i === breadcrumbs.length - 1 ? "text-slate-700 font-medium" : ""}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
          <Bell size={17} />
          <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-tight text-slate-800">
                  {user?.name ?? "Admin"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">{user?.name}</span>
                <span className="text-xs text-slate-500">{user?.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User size={14} />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings size={14} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}