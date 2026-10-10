"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Loader2, MoreHorizontal, Trash2, Search, ListFilter, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/data-table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { getPosisi, updatePosisiDetail, deletePosisi, type PosisiRow } from "./actions";

interface DriverOption { id: string; namaSupir: string }
interface CarOption { id: string; platMobil: string; jenisMobil: string }

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function daysSince(iso: string | null): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function PosisiClient({ initialPosisi, drivers, cars }: { initialPosisi: PosisiRow[]; drivers: DriverOption[]; cars: CarOption[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: posisi } = useQuery({ queryKey: ["posisi"], queryFn: getPosisi, initialData: initialPosisi });

  // -- states --
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PosisiRow | null>(null);
  const [carId, setCarId] = useState("");
  const [userPosisi, setUserPosisi] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PosisiRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // -- filter states --
  const [filterTahun, setFilterTahun] = useState("");
  const [filterTransmisi, setFilterTransmisi] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterPosisi, setFilterPosisi] = useState("");
  const [filterSupir, setFilterSupir] = useState("");
  const hasFilter = filterTahun || filterTransmisi || filterJenis || filterPosisi || filterSupir;
  function resetFilters() {
    setFilterTahun(""); setFilterTransmisi(""); setFilterJenis(""); setFilterPosisi(""); setFilterSupir("");
  }

  // -- computed unique options --
  const tahunOptions = useMemo(() => Array.from(new Set(posisi.map(p => p.tahun))).sort((a, b) => b - a), [posisi]);
  const transmisiOptions = useMemo(() => Array.from(new Set(posisi.map(p => p.transmisi))).sort(), [posisi]);
  const jenisOptions = useMemo(() => Array.from(new Set(posisi.map(p => p.jenisMobil))).sort(), [posisi]);
  const posisiOptions = useMemo(() => Array.from(new Set(posisi.map(p => p.userPosisi).filter(Boolean))).sort(), [posisi]);
  const supirOptions = useMemo(() => Array.from(new Set(posisi.map(p => p.driverName).filter(Boolean))).sort(), [posisi]);

  // -- filtered data --
  const filtered = useMemo(() => {
    let result = posisi;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.platMobil.toLowerCase().includes(q) || (p.userPosisi ?? "").toLowerCase().includes(q) || (p.driverName ?? "").toLowerCase().includes(q));
    }
    if (filterTahun) result = result.filter(p => p.tahun === Number(filterTahun));
    if (filterTransmisi) result = result.filter(p => p.transmisi === filterTransmisi);
    if (filterJenis) result = result.filter(p => p.jenisMobil === filterJenis);
    if (filterPosisi) result = result.filter(p => p.userPosisi === filterPosisi);
    if (filterSupir) result = result.filter(p => p.driverName === filterSupir);
    return result;
  }, [posisi, searchQuery, filterTahun, filterTransmisi, filterJenis, filterPosisi, filterSupir]);

  const activeFilterCount = [filterTahun, filterTransmisi, filterJenis, filterPosisi, filterSupir].filter(Boolean).length;

  // -- mutations --
  function resetForm() { setEditing(null); setCarId(""); setUserPosisi(""); setDriverId(""); setNotes(""); }
  function handleEdit(p: PosisiRow) { setEditing(p); setCarId(p.carId); setUserPosisi(p.userPosisi ?? ""); setDriverId(p.driverId ?? ""); setNotes(""); setOpen(true); }

  const mut = useMutation({
    mutationFn: updatePosisiDetail,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["posisi"] }); toast.success("Posisi berhasil diperbarui!"); setOpen(false); resetForm(); router.refresh(); },
    onError: () => toast.error("Gagal menyimpan"),
  });
  const deleteMut = useMutation({
    mutationFn: deletePosisi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["posisi"] }); toast.success("Posisi dihapus"); setDeleteTarget(null); router.refresh(); },
    onError: () => toast.error("Gagal menghapus"),
  });

  function onSubmit(e: React.FormEvent) { e.preventDefault(); mut.mutate({ carId, userPosisi, driverId: driverId || undefined, notes: notes || undefined }); }

  // -- columns --
  const columns: ColumnDef<PosisiRow>[] = [
    { id: "no", header: "No", cell: ({ row }) => <span className="tabular-nums text-slate-400">{row.index + 1}</span> },
    { id: "platMobil", header: "Plat Mobil", accessorKey: "platMobil", cell: ({ getValue }) => <span className="font-mono font-semibold text-slate-800 whitespace-nowrap">{getValue<string>()}</span> },
    { id: "tahun", header: "Tahun", accessorKey: "tahun", cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span> },
    { id: "transmisi", header: "Transmisi", accessorKey: "transmisi" },
    { id: "jenisMobil", header: "Jenis Mobil", accessorKey: "jenisMobil" },
    { id: "userPosisi", header: "Posisi/User", cell: ({ row }) => <span className="text-slate-700">{row.original.userPosisi ?? "—"}</span> },
    { id: "driver", header: "Supir", cell: ({ row }) => <span className="text-slate-700">{row.original.driverName ?? "—"}</span> },
    {
      id: "terakhirUpdate", header: "Terakhir Update",
      cell: ({ row }) => {
        const dateVal = row.original.updatedAt;
        if (!dateVal) return <span className="text-slate-400">-</span>;
        const d = new Date(dateVal);
        const dateStr = d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" });
        const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).replace(".", ":");
        const stale = daysSince(dateVal) >= 7;
        return (
          <div className={`flex flex-col text-xs leading-tight ${stale ? "text-amber-600" : ""}`}>
            <span className="font-medium text-slate-700">{dateStr}</span>
            <span className="text-slate-500">{timeStr} WIB</span>
          </div>
        );
      },
    },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal size={16} /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => handleEdit(row.original)}><Pencil size={14} /> Update Posisi</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(row.original)}><Trash2 size={14} /> Hapus</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  // -- render --
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Posisi Mobil</h1><p className="text-sm text-slate-500">Kelola posisi dan penugasan driver pada armada</p></div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={() => resetForm()}><Plus size={16} /> Tambah Posisi</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Update Posisi & Supir" : "Tambah Posisi"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mobil</label>
                <select value={carId} onChange={e => setCarId(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" required disabled={!!editing}>
                  <option value="">Pilih mobil...</option>
                  {(editing ? cars : cars.filter(c => !posisi.find(p => p.carId === c.id))).map(c => <option key={c.id} value={c.id}>{c.platMobil} — {c.jenisMobil}</option>)}
                </select>
              </div>
              <Input label="Posisi / User" value={userPosisi} onChange={e => setUserPosisi(e.target.value)} placeholder="Contoh: Pool Subang" />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Supir</label>
                <select value={driverId} onChange={e => setDriverId(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900">
                  <option value="">— Pilih Supir —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.namaSupir}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Catatan (Opsional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Instruksi khusus..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Batal</Button>
                <Button type="submit" disabled={mut.isPending}>{mut.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-3 mb-4 w-full">
        <div className="relative w-72 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Cari plat, posisi, atau supir..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20" />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800">
              <ListFilter size={14} />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">{activeFilterCount}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={8} avoidCollisions={false} className="w-80 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter Posisi</p>
              <SelectFilter label="Tahun" value={filterTahun} onChange={setFilterTahun} options={tahunOptions.map(v => ({ value: String(v), label: String(v) }))} />
              <SelectFilter label="Transmisi" value={filterTransmisi} onChange={setFilterTransmisi} options={transmisiOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Jenis Mobil" value={filterJenis} onChange={setFilterJenis} options={jenisOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Posisi / User" value={filterPosisi} onChange={setFilterPosisi} options={posisiOptions.map(v => ({ value: v!, label: v! }))} />
              <SelectFilter label="Supir" value={filterSupir} onChange={setFilterSupir} options={supirOptions.map(v => ({ value: v!, label: v! }))} />
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => document.body.click()}>Terapkan</Button>
                <Button size="sm" variant="outline" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DataTable columns={columns} data={filtered} hideSearch emptyTitle="Belum ada data posisi" />

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Posisi</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Yakin ingin menghapus posisi <span className="font-semibold text-slate-900">{deleteTarget?.platMobil}</span>? Tindakan ini tidak dapat dibatalkan.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.carId); }} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 size={14} className="animate-spin" />} Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-500">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">
        <option value="">Semua</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}