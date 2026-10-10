"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, Loader2, MoreHorizontal, Search, ListFilter } from "lucide-react";
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
import { getDrivers, createDriver, updateDriver, deleteDriver, type DriverRow } from "./actions";
import { toTitleCase } from "@/lib/utils";

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

export function DriverClient({ initialDrivers }: { initialDrivers: DriverRow[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: drivers } = useQuery({ queryKey: ["drivers"], queryFn: getDrivers, initialData: initialDrivers });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DriverRow | null>(null);
  const [name, setName] = useState("");
  const [noUrut, setNoUrut] = useState("");
  const [tglGaji, setTglGaji] = useState("");
  const [gajiPokok, setGajiPokok] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DriverRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // filter states
  const [filterNama, setFilterNama] = useState("");
  const [filterGaji, setFilterGaji] = useState("");
  const [filterMobil, setFilterMobil] = useState("");
  const [filterPosisi, setFilterPosisi] = useState("");
  const hasFilter = filterNama || filterGaji || filterMobil || filterPosisi;
  function resetFilters() { setFilterNama(""); setFilterGaji(""); setFilterMobil(""); setFilterPosisi(""); }

  // computed unique options
  const namaOptions = useMemo(() => Array.from(new Set(drivers.map(d => d.namaSupir))).sort(), [drivers]);
  const gajiOptions = useMemo(() => {
    const s = new Set(drivers.map(d => d.tanggalGajian).filter(Boolean));
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [drivers]);
  const mobilOptions = useMemo(() => {
    const s = new Set(drivers.map(d => d.platMobil ? `${d.jenisMobil} ${d.platMobil}` : "Standby / Tidak Ada").filter(Boolean));
    return Array.from(s).sort();
  }, [drivers]);
  const posisiOptions = useMemo(() => {
    const s = new Set(drivers.map(d => d.posisi ?? "Standby").filter(Boolean));
    return Array.from(s).sort();
  }, [drivers]);
  const activeFilterCount = [filterNama, filterGaji, filterMobil, filterPosisi].filter(Boolean).length;

  // filtered
  const filtered = useMemo(() => {
    let result = drivers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.namaSupir.toLowerCase().includes(q) || (d.platMobil ?? "").toLowerCase().includes(q) || (d.posisi ?? "").toLowerCase().includes(q));
    }
    if (filterNama) result = result.filter(d => d.namaSupir === filterNama);
    if (filterGaji) result = result.filter(d => d.tanggalGajian === Number(filterGaji));
    if (filterMobil) {
      if (filterMobil === "Standby / Tidak Ada") result = result.filter(d => !d.platMobil);
      else result = result.filter(d => `${d.jenisMobil} ${d.platMobil}` === filterMobil);
    }
    if (filterPosisi) {
      if (filterPosisi === "Standby") result = result.filter(d => !d.posisi);
      else result = result.filter(d => d.posisi === filterPosisi);
    }
    return result;
  }, [drivers, searchQuery, filterNama, filterGaji, filterMobil, filterPosisi]);

  function reset() { setEditing(null); setName(""); setNoUrut(""); setTglGaji(""); setGajiPokok(""); }
  function handleEdit(d: DriverRow) { setEditing(d); setName(d.namaSupir); setNoUrut(d.noUrut?.toString() ?? ""); setTglGaji(d.tanggalGajian?.toString() ?? ""); setGajiPokok(d.gajiPokok?.toString() ?? ""); setOpen(true); }

  const createMut = useMutation({ mutationFn: createDriver, onSuccess: () => { qc.invalidateQueries({ queryKey: ["drivers"] }); toast.success("Driver ditambahkan"); setOpen(false); reset(); router.refresh(); }, onError: () => toast.error("Gagal") });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: { namaSupir: string; noUrut?: number; tanggalGajian?: number; gajiPokok?: number } }) => updateDriver(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["drivers"] }); toast.success("Driver diperbarui"); setOpen(false); reset(); router.refresh(); }, onError: () => toast.error("Gagal") });
  const deleteMut = useMutation({ mutationFn: deleteDriver, onSuccess: () => { qc.invalidateQueries({ queryKey: ["drivers"] }); toast.success("Driver dihapus"); setDeleteTarget(null); router.refresh(); }, onError: () => toast.error("Gagal") });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { namaSupir: name, noUrut: noUrut ? parseInt(noUrut) : undefined, tanggalGajian: tglGaji ? parseInt(tglGaji) : undefined, gajiPokok: gajiPokok ? parseInt(gajiPokok) : undefined };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteMut.mutateAsync(deleteTarget.id); } finally { setDeleting(false); }
  }

  const columns: ColumnDef<DriverRow>[] = [
    { id: "noUrut", header: "No", accessorKey: "noUrut", cell: ({ getValue }) => <span className="tabular-nums text-slate-600">{getValue<number>() ?? "—"}</span> },
    { id: "namaSupir", header: "Supir", accessorKey: "namaSupir", cell: ({ getValue }) => <span className="font-medium text-slate-800">{toTitleCase(getValue<string>())}</span> },
    { id: "tanggalGajian", header: "Tanggal Gajian", cell: ({ row }) => <span className="text-slate-600">Tgl {row.original.tanggalGajian ?? "—"} setiap bulan</span> },
    {
      id: "gajiPokok", header: "Nominal Gaji",
      accessorKey: "gajiPokok",
      cell: ({ getValue }) => {
        const val = getValue<number | null>();
        if (val === null || val === undefined || val === 0) return <span className="text-slate-400">-</span>;
        return <span className="font-mono tabular-nums font-medium text-slate-800">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val)}</span>;
      },
    },
    {
      id: "mobilDipegang", header: "Mobil Dipegang",
      cell: ({ row }) => {
        if (!row.original.platMobil) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex flex-col text-xs leading-tight">
            <span className="font-normal text-slate-600">{row.original.jenisMobil ?? "-"}</span>
            <span className="font-bold text-slate-800 whitespace-nowrap">{row.original.platMobil}</span>
          </div>
        );
      },
    },
    {
      id: "posisi", header: "Posisi",
      cell: ({ row }) => (<span className="text-slate-700">{row.original.posisi ?? "Standby"}</span>),
    },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal size={16} /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => handleEdit(row.original)}><Pencil size={14} /> Edit Driver</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(row.original)}><Trash2 size={14} /> Hapus</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Master Driver</h1><p className="text-sm text-slate-500">Kelola data supir MTH & Tetap</p></div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button onClick={() => reset()}><Plus size={16} /> Tambah Driver</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Driver" : "Tambah Driver"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input label="Nama Supir" value={name} onChange={e => setName(e.target.value)} required />
              <Input label="No Urut" type="number" value={noUrut} onChange={e => setNoUrut(e.target.value)} />
              <Input label="Tanggal Gajian (tgl)" type="number" value={tglGaji} onChange={e => setTglGaji(e.target.value)} placeholder="Contoh: 25" />
              <Input label="Nominal Gaji (Rp)" type="number" value={gajiPokok} onChange={e => setGajiPokok(e.target.value)} placeholder="Contoh: 4500000" />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Batal</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="animate-spin" size={14} />}
                  {editing ? "Simpan" : "Tambah"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-end gap-3 mb-4 w-full">
        <div className="relative w-72 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Cari supir, mobil, atau posisi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20" />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800">
              <ListFilter size={14} /> Filter
              {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">{activeFilterCount}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={8} avoidCollisions={false} className="w-80 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter Driver</p>
              <SelectFilter label="Supir" value={filterNama} onChange={setFilterNama} options={namaOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Tanggal Gajian" value={filterGaji} onChange={setFilterGaji} options={gajiOptions.map(v => ({ value: String(v), label: `Tgl ${v}` }))} />
              <SelectFilter label="Mobil Dipegang" value={filterMobil} onChange={setFilterMobil} options={mobilOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Posisi" value={filterPosisi} onChange={setFilterPosisi} options={posisiOptions.map(v => ({ value: v!, label: v! }))} />
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => document.body.click()}>Terapkan</Button>
                <Button size="sm" variant="outline" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DataTable columns={columns} data={filtered} hideSearch emptyTitle="Belum ada data driver" />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Driver</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Yakin ingin menghapus <span className="font-semibold text-slate-900">{deleteTarget?.namaSupir}</span>? Tindakan ini tidak dapat dibatalkan.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting && <Loader2 size={14} className="animate-spin" />} Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}