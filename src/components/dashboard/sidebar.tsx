"use client";

import {
  LayoutDashboard,
  Car,
  MapPin,
  Users,
  Wrench,
  CircleDot,
  FileText,
  Banknote,
  Shield,
  ClipboardList,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    category: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    category: "Operational",
    items: [
      { label: "Armada", href: "/cars", icon: <Car size={18} /> },
      { label: "Posisi", href: "/posisi", icon: <MapPin size={18} /> },
      { label: "Driver", href: "/driver", icon: <Users size={18} /> },
      { label: "Perawatan", href: "/perawatan", icon: <Wrench size={18} /> },
      { label: "Ban & Oli", href: "/ban-oli", icon: <CircleDot size={18} /> },
    ],
  },
  {
    category: "Contract & Finance",
    items: [
      { label: "Kontrak", href: "/contracts", icon: <FileText size={18} /> },
      { label: "Leasing", href: "/leasing", icon: <Banknote size={18} /> },
      { label: "Asuransi", href: "/insurance", icon: <Shield size={18} /> },
      { label: "Log UJ", href: "/driver-logs", icon: <ClipboardList size={18} /> },
      { label: "Invoice", href: "/invoices", icon: <Receipt size={18} />, badge: "Tax" },
    ],
  },
];

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
        isActive
          ? "bg-indigo-50 font-semibold text-indigo-600 shadow-sm"
          : "font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
        collapsed && "justify-center px-2"
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600" />
      )}
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white md:hidden"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 md:relative",
          collapsed ? "w-[68px]" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            M
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">MTH Fleet</span>
              <span className="text-[10px] tracking-wider uppercase text-slate-400">
                ERP System
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group, gi) => (
            <div key={group.category} className={cn(gi > 0 && "mt-4")}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.category}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden h-10 items-center justify-center gap-2 border-t border-slate-200 text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 md:flex"
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </aside>
    </>
  );
}