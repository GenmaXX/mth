"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus, Pencil, Trash2, Loader2, MoreHorizontal, Search, ListFilter, Eye, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/data-table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPerawatan, createPerawatan, updatePerawatan, deletePerawatan, type PerawatanRow, type CreatePerawatanInput } from "./actions";

const defaultForm: CreatePerawatanInput = {
  tanggal: new Date(),
  carId: "",
  bengkel: "",
  bank: "",
  namaPenerima: "",
  noRekening: "",
  isOli: false,
  isBan: false,
  isAki: false,
  isAc: false,
  isOr: false,
  isService: false,
  serviceGanti: "",
  kmSebelum: undefined,
  kmSesudah: undefined,
  sebelumUrl: "",
  sesudahUrl: "",
  nominal: 0,
};

function formatTanggal(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function PerawatanClient({ initialPerawatan, cars }: { initialPerawatan: PerawatanRow[]; cars: { id: string; platMobil: string; jenisMobil: string }[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: perawatan } = useQuery({ queryKey: ["perawatan"], queryFn: getPerawatan, initialData: initialPerawatan });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PerawatanRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PerawatanRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterBengkel, setFilterBengkel] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const hasDateFilter = startDate || endDate;
  const hasFilter = hasDateFilter || filterJenis || filterBengkel || filterBank;
  function resetFilters() { setStartDate(""); setEndDate(""); setFilterJenis(""); setFilterBengkel(""); setFilterBank(""); }
  const activeFilterCount = [startDate && endDate ? "date" : "", filterJenis, filterBengkel, filterBank].filter(Boolean).length;

  // computed unique options
  const jenisOptions = useMemo(() => Array.from(new Set(perawatan.map(p => p.jenisMobil))).sort(), [perawatan]);
  const bengkelOptions = useMemo(() => Array.from(new Set(perawatan.map(p => p.bengkel))).sort(), [perawatan]);
  const bankOptions = useMemo(() => Array.from(new Set(perawatan.map(p => p.bank).filter(Boolean))).sort(), [perawatan]);

  const [form, setForm] = useState<CreatePerawatanInput>(defaultForm);

  function resetForm() { setForm(defaultForm); setEditing(null); }

  function handleEdit(p: PerawatanRow) {
    setForm({
      tanggal: new Date(p.tanggal),
      carId: p.carId,
      bengkel: p.bengkel,
      bank: p.bank ?? "",
      namaPenerima: p.namaPenerima ?? "",
      noRekening: p.noRekening ?? "",
      isOli: p.isOli,
      isBan: p.isBan,
      isAki: p.isAki,
      isAc: p.isAc,
      isOr: p.isOr,
      isService: p.isService,
      serviceGanti: p.keterangan ?? p.serviceGanti ?? "",
      kmSebelum: p.kmSebelum ?? undefined,
      kmSesudah: p.kmSesudah ?? undefined,
      sebelumUrl: p.sebelumUrl ?? "",
      sesudahUrl: p.sesudahUrl ?? "",
      nominal: p.nominal,
    });
    setEditing(p);
    setOpen(true);
  }

  const createMut = useMutation({ mutationFn: createPerawatan, onSuccess: () => { qc.invalidateQueries({ queryKey: ["perawatan"] }); toast.success("Perawatan dicatat"); setOpen(false); resetForm(); router.refresh(); }, onError: () => toast.error("Gagal") });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: CreatePerawatanInput }) => updatePerawatan(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["perawatan"] }); toast.success("Perawatan diperbarui"); setOpen(false); resetForm(); router.refresh(); }, onError: () => toast.error("Gagal") });
  const deleteMut = useMutation({ mutationFn: deletePerawatan, onSuccess: () => { qc.invalidateQueries({ queryKey: ["perawatan"] }); toast.success("Perawatan dihapus"); setDeleteTarget(null); router.refresh(); }, onError: () => toast.error("Gagal") });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteMut.mutateAsync(deleteTarget.id); } finally { setDeleting(false); }
  }

  const filtered = useMemo(() => {
    let result = perawatan;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.platMobil.toLowerCase().includes(q) || p.bengkel.toLowerCase().includes(q));
    }
    if (startDate) result = result.filter((p) => new Date(p.tanggal) >= new Date(startDate));
    if (endDate) result = result.filter((p) => new Date(p.tanggal) <= new Date(endDate + "T23:59:59"));
    if (filterJenis) result = result.filter((p) => p.jenisMobil === filterJenis);
    if (filterBengkel) result = result.filter((p) => p.bengkel === filterBengkel);
    if (filterBank) {
      if (filterBank === "(Kosong)") result = result.filter((p) => !p.bank);
      else result = result.filter((p) => p.bank === filterBank);
    }
    return result;
  }, [perawatan, searchQuery, startDate, endDate, filterJenis, filterBengkel, filterBank]);

  const columns: ColumnDef<PerawatanRow>[] = [
    { id: "no", header: "No", cell: ({ row }) => <span className="tabular-nums text-slate-400">{row.index + 1}</span> },
    { id: "tanggal", header: "Tanggal", cell: ({ row }) => <span className="whitespace-nowrap">{formatTanggal(row.original.tanggal)}</span> },
    { id: "jenisMobil", header: "Jenis Mobil", accessorKey: "jenisMobil" },
    { id: "platMobil", header: "Plat Mobil", cell: ({ row }) => (
      <span className="font-mono font-bold text-slate-800 whitespace-nowrap">{row.original.platMobil}</span>
    )},
    { id: "bengkel", header: "Bengkel", accessorKey: "bengkel" },
    {
      id: "pembayaran", header: "Pembayaran",
      cell: ({ row }) => {
        const p = row.original;
        if (!p.bank && !p.namaPenerima) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex flex-col text-xs leading-tight">
            {p.bank && <span className="text-slate-700">{p.bank}</span>}
            {p.namaPenerima && <span className="text-slate-600">{p.namaPenerima}</span>}
            {p.noRekening && <span className="font-mono text-slate-500">{p.noRekening}</span>}
          </div>
        );
      },
    },
    {
      id: "items", header: "Item Servis",
      cell: ({ row }) => {
        const p = row.original;
        const badges: { label: string; className: string }[] = [];
        if (p.isOr) badges.push({ label: "OR", className: "bg-purple-100 text-purple-700" });
        if (p.isOli) badges.push({ label: "Oli", className: "bg-blue-100 text-blue-700" });
        if (p.isBan) badges.push({ label: "Ban", className: "bg-emerald-100 text-emerald-700" });
        if (p.isAki) badges.push({ label: "Aki", className: "bg-amber-100 text-amber-700" });
        if (p.isAc) badges.push({ label: "AC", className: "bg-cyan-100 text-cyan-700" });
        if (p.isService || p.serviceGanti) badges.push({ label: "Service", className: "bg-slate-100 text-slate-700" });
        if (badges.length === 0 && !p.keterangan) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              {badges.map((b) => (
                <span key={b.label} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.className}`}>
                  {b.label}
                </span>
              ))}
            </div>
            {p.keterangan && (
              <span className="max-w-[200px] text-[10px] italic leading-tight text-slate-500" title={p.keterangan}>
                {p.keterangan}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "bukti", header: "Bukti",
      cell: ({ row }) => {
        const p = row.original;
        if (!p.sebelumUrl && !p.sesudahUrl) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex gap-1 items-center">
            {p.sebelumUrl && <button onClick={() => setImagePreview(p.sebelumUrl)} className="overflow-hidden rounded border border-slate-200"><img src={p.sebelumUrl} alt="sebelum" className="w-10 h-8 object-cover hover:opacity-80" /></button>}
            {p.sesudahUrl && <button onClick={() => setImagePreview(p.sesudahUrl)} className="overflow-hidden rounded border border-slate-200"><img src={p.sesudahUrl} alt="sesudah" className="w-10 h-8 object-cover hover:opacity-80" /></button>}
          </div>
        );
      },
    },
    { id: "nominal", header: "Nominal", accessorKey: "nominal", cell: ({ getValue }) => <span className="font-mono tabular-nums text-slate-800">{formatRupiah(getValue<number>())}</span> },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <button
          onClick={() => router.push(`/cars/${row.original.carId}?tab=perawatan`)}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          <Eye size={12} /> Lihat Detail
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal size={16} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}><Pencil size={14} /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(row.original)}><Trash2 size={14} /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Perawatan</h1><p className="text-sm text-slate-500">Catatan servis dan perawatan armada</p></div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={() => resetForm()}><Plus size={16} /> Catat Perawatan</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Perawatan" : "Catat Perawatan Baru"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="max-h-[70vh] space-y-3 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mobil</label>
                <select value={form.carId} onChange={e => setForm({ ...form, carId: e.target.value })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" required>
                  <option value="">Pilih mobil...</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.platMobil} — {c.jenisMobil}</option>)}
                </select>
              </div>
              <Input label="Tanggal" type="date" value={form.tanggal instanceof Date ? form.tanggal.toISOString().split("T")[0] : ""} onChange={e => setForm({ ...form, tanggal: new Date(e.target.value) })} required />
              <Input label="Bengkel" value={form.bengkel} onChange={e => setForm({ ...form, bengkel: e.target.value })} required />
              <div className="grid grid-cols-3 gap-2">
                <Input label="Bank" value={form.bank ?? ""} onChange={e => setForm({ ...form, bank: e.target.value })} />
                <Input label="Nama Penerima" value={form.namaPenerima ?? ""} onChange={e => setForm({ ...form, namaPenerima: e.target.value })} />
                <Input label="No. Rekening" value={form.noRekening ?? ""} onChange={e => setForm({ ...form, noRekening: e.target.value })} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Item Servis</p>
                <div className="flex flex-wrap gap-3">
                  {(["Oli", "Ban", "Aki", "AC", "OR", "Service"] as const).map((label) => {
                    const key = `is${label}` as keyof CreatePerawatanInput;
                    return (
                      <label key={label} className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="checkbox" checked={!!(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="rounded border-slate-300" />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <textarea value={form.serviceGanti ?? ""} onChange={e => setForm({ ...form, serviceGanti: e.target.value })} className="mt-2 h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Detail service / ganti lainnya..." />
              </div>
              {form.isOli && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Input label="KM Sebelum" type="number" value={form.kmSebelum ?? ""} onChange={e => setForm({ ...form, kmSebelum: e.target.value ? parseInt(e.target.value) : undefined })} />
                  <Input label="KM Sesudah" type="number" value={form.kmSesudah ?? ""} onChange={e => setForm({ ...form, kmSesudah: e.target.value ? parseInt(e.target.value) : undefined })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input label="Foto Sebelum (URL)" value={form.sebelumUrl ?? ""} onChange={e => setForm({ ...form, sebelumUrl: e.target.value })} placeholder="https://..." />
                <Input label="Foto Sesudah (URL)" value={form.sesudahUrl ?? ""} onChange={e => setForm({ ...form, sesudahUrl: e.target.value })} placeholder="https://..." />
              </div>
              <Input label="Nominal Biaya (Rp)" type="number" value={form.nominal || ""} onChange={e => setForm({ ...form, nominal: parseInt(e.target.value) || 0 })} required />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Batal</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="animate-spin" size={14} />}
                  {editing ? "Simpan" : "Catat"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-3 mb-4 w-full">
        <div className="relative w-72 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Cari plat / bengkel..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20" />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800">
              <ListFilter size={14} />
              Filter
              {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">{activeFilterCount}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={8} avoidCollisions={false} className="w-80 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter Perawatan</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Dari Tanggal</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Sampai Tanggal</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700" />
                </div>
              </div>
              <SelectFilter label="Jenis Mobil" value={filterJenis} onChange={setFilterJenis} options={jenisOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Bengkel" value={filterBengkel} onChange={setFilterBengkel} options={bengkelOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Bank / Pembayaran" value={filterBank} onChange={setFilterBank} options={[...bankOptions.filter(Boolean).map(v => ({ value: v!, label: v! })), { value: "(Kosong)", label: "(Kosong)" }]} />
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => document.body.click()}>Terapkan</Button>
                <Button size="sm" variant="outline" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DataTable columns={columns} data={filtered} emptyTitle="Belum ada catatan perawatan" hideSearch />

      {/* Ringkasan total nominal */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
        <span className="text-slate-600">
          Menampilkan <span className="font-semibold text-slate-800">{filtered.length}</span> dari <span className="font-semibold text-slate-800">{perawatan.length}</span> data
        </span>
        <span className="text-slate-600">
          Total Biaya: <span className="font-semibold text-slate-900">{formatRupiah(filtered.reduce((sum, p) => sum + p.nominal, 0))}</span>
        </span>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Perawatan</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Yakin ingin menghapus catatan perawatan ini? Tindakan tidak dapat dibatalkan.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting && <Loader2 size={14} className="animate-spin" />} Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imagePreview} onOpenChange={v => !v && setImagePreview(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Preview Bukti</DialogTitle></DialogHeader>
          {imagePreview && <img src={imagePreview} alt="Bukti" className="max-h-[60vh] w-full rounded object-contain" />}
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