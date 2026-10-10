"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, Loader2, MoreHorizontal, Search, Eye, ListFilter } from "lucide-react";
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
import { formatDate, parseToWibDate } from "@/lib/date";
import { getBanOli, upsertBanOli, deleteBanOli, type BanOliRow, type CreateBanOliInput } from "./actions";

const defaultForm: CreateBanOliInput = {
  carId: "", tempatSupir: "", driver: "",
  kodeBanDKanan: "", tglBanDKanan: undefined,
  kodeBanDKiri: "", tglBanDKiri: undefined,
  kodeBanBKanan: "", tglBanBKanan: undefined,
  kodeBanBKiri: "", tglBanBKiri: undefined,
  kodeBanSerep: "", tglBanSerep: undefined,
  dongkrak: "", kunciRoda: "",
  updateKm: undefined, updateKmTgl: undefined,
  kmKartuGantiOli: "", tglKartuGantiOli: undefined,
  tglAki: undefined, tglWiper: undefined, tglServiceLain: undefined,
  serviceLain: "", keterangan: "",
};

const perlengkapanOptions = ["Lengkap", "Alat Listrik (Lengkap)", "Tdk Ada"];

function toInputDate(d: Date | undefined) { return d instanceof Date ? d.toISOString().split("T")[0] : ""; }

function perlengkapanBadge(val: string | null) {
  if (!val) return <span className="text-slate-400">-</span>;
  const v = val.toLowerCase();
  const isBad = v.includes("tdk") || v.includes("tidak");
  const isAlat = v.includes("alat") || v.includes("listrik");
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${isBad ? "bg-red-50 text-red-600" : isAlat ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-600"}`}>
      {val}
    </span>
  );
}

function BanGrid({ data }: { data: BanOliRow }) {
  const items: [string, string | null, string | null][] = [
    ["D.Kanan", data.kodeBanDKanan, data.tglBanDKanan],
    ["D.Kiri", data.kodeBanDKiri, data.tglBanDKiri],
    ["B.Kanan", data.kodeBanBKanan, data.tglBanBKanan],
    ["B.Kiri", data.kodeBanBKiri, data.tglBanBKiri],
    ["Serep", data.kodeBanSerep, data.tglBanSerep],
  ];
  const hasData = items.some(([, k]) => k);
  if (!hasData) return <span className="text-slate-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(([label, kode, tgl]) => kode ? (
        <div key={label} className="flex-col rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-center min-w-[48px]">
          <p className="text-[7px] font-semibold uppercase text-slate-400">{label}</p>
          <p className="font-mono text-[10px] font-bold text-slate-800">{kode}</p>
          {tgl && <p className="text-[8px] text-slate-400">{formatDate(tgl)}</p>}
        </div>
      ) : null)}
    </div>
  );
}

export function BanOliClient({ initialData, cars }: { initialData: BanOliRow[]; cars: { id: string; platMobil: string; jenisMobil: string }[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: records } = useQuery({ queryKey: ["ban-oli"], queryFn: getBanOli, initialData });

  const [open, setOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<BanOliRow | null>(null);
  const [editing, setEditing] = useState<BanOliRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BanOliRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // filter states
  const [filterPlat, setFilterPlat] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterTransmisi, setFilterTransmisi] = useState("");
  const [filterPosisi, setFilterPosisi] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const activeFilterCount = [filterPlat, filterTahun, filterTransmisi, filterPosisi, filterDriver].filter(Boolean).length;
  function resetFilters() { setFilterPlat(""); setFilterTahun(""); setFilterTransmisi(""); setFilterPosisi(""); setFilterDriver(""); }

  const platOptions = useMemo(() => Array.from(new Set(records.map(r => r.platMobil))).sort(), [records]);
  const tahunOptions = useMemo(() => Array.from(new Set(records.map(r => r.tahun))).sort((a, b) => b - a), [records]);
  const transmisiOptions = useMemo(() => Array.from(new Set(records.map(r => r.transmisi))).sort(), [records]);
  const posisiOptions = useMemo(() => Array.from(new Set(records.map(r => r.tempatSupir).filter(Boolean))).sort(), [records]);
  const driverOptions = useMemo(() => Array.from(new Set(records.map(r => r.driver).filter(Boolean))).sort(), [records]);

  const [form, setForm] = useState<CreateBanOliInput>(defaultForm);

  function resetForm() { setForm(defaultForm); setEditing(null); }
  function handleEdit(r: BanOliRow) {
    setForm({
      ...defaultForm,
      carId: r.carId, tempatSupir: r.tempatSupir ?? "", driver: r.driver ?? "",
      kodeBanDKanan: r.kodeBanDKanan ?? "", tglBanDKanan: r.tglBanDKanan ? new Date(r.tglBanDKanan) : undefined,
      kodeBanDKiri: r.kodeBanDKiri ?? "", tglBanDKiri: r.tglBanDKiri ? new Date(r.tglBanDKiri) : undefined,
      kodeBanBKanan: r.kodeBanBKanan ?? "", tglBanBKanan: r.tglBanBKanan ? new Date(r.tglBanBKanan) : undefined,
      kodeBanBKiri: r.kodeBanBKiri ?? "", tglBanBKiri: r.tglBanBKiri ? new Date(r.tglBanBKiri) : undefined,
      kodeBanSerep: r.kodeBanSerep ?? "", tglBanSerep: r.tglBanSerep ? new Date(r.tglBanSerep) : undefined,
      dongkrak: r.dongkrak ?? "", kunciRoda: r.kunciRoda ?? "",
      updateKm: r.updateKm ?? undefined, updateKmTgl: r.updateKmTgl ? new Date(r.updateKmTgl) : undefined,
      kmKartuGantiOli: r.kmKartuGantiOli ?? "", tglKartuGantiOli: r.tglKartuGantiOli ? new Date(r.tglKartuGantiOli) : undefined,
      tglAki: r.tglAki ? new Date(r.tglAki) : undefined,
      tglWiper: r.tglWiper ? new Date(r.tglWiper) : undefined,
      tglServiceLain: undefined,
      serviceLain: r.serviceLain ?? "", keterangan: r.keterangan ?? "",
    });
    setEditing(r); setOpen(true);
  }

  const upsertMut = useMutation({
    mutationFn: upsertBanOli,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ban-oli"] }); toast.success(editing ? "Data diperbarui" : "Data ditambahkan"); setOpen(false); resetForm(); router.refresh(); },
    onError: () => toast.error("Gagal menyimpan"),
  });
  const deleteMut = useMutation({
    mutationFn: deleteBanOli,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ban-oli"] }); toast.success("Data dihapus"); setDeleteTarget(null); router.refresh(); },
    onError: () => toast.error("Gagal menghapus"),
  });

  function onSubmit(e: React.FormEvent) { e.preventDefault(); upsertMut.mutate(form); }
  async function confirmDelete() {
    if (!deleteTarget) return; setDeleting(true);
    try { await deleteMut.mutateAsync(deleteTarget.id); } finally { setDeleting(false); }
  }

  const filtered = useMemo(() => {
    let result = records;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.platMobil.toLowerCase().includes(q) || (r.tempatSupir ?? "").toLowerCase().includes(q) || (r.driver ?? "").toLowerCase().includes(q));
    }
    if (filterPlat) result = result.filter(r => r.platMobil === filterPlat);
    if (filterTahun) result = result.filter(r => r.tahun === Number(filterTahun));
    if (filterTransmisi) result = result.filter(r => r.transmisi === filterTransmisi);
    if (filterPosisi) result = result.filter(r => r.tempatSupir === filterPosisi);
    if (filterDriver) result = result.filter(r => r.driver === filterDriver);
    return result;
  }, [records, searchQuery, filterPlat, filterTahun, filterTransmisi, filterPosisi, filterDriver]);

  const columns: ColumnDef<BanOliRow>[] = [
    { id: "no", header: "No", cell: ({ row }) => <span className="tabular-nums text-slate-500">{row.index + 1}</span> },
    { id: "plat", header: "Plat Mobil", cell: ({ row }) => <span className="font-bold text-slate-800 whitespace-nowrap min-w-[120px]">{row.original.platMobil}</span> },
    { id: "tahun", header: "Tahun", cell: ({ row }) => <span className="tabular-nums text-slate-600">{row.original.tahun}</span> },
    { id: "transmisi", header: "Transmisi", cell: ({ row }) => <span className="text-slate-600">{row.original.transmisi}</span> },
    { id: "posisi", header: "Posisi / User", cell: ({ row }) => <span className="text-slate-700">{row.original.tempatSupir ?? "-"}</span> },
    { id: "driver", header: "Supir", cell: ({ row }) => <span className="text-slate-700">{row.original.driver ?? "-"}</span> },
    { id: "kodeBan", header: "Kode Ban", cell: ({ row }) => <BanGrid data={row.original} /> },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setDetailTarget(row.original)} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Eye size={14} /></button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal size={14} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}><Pencil size={13} /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(row.original)}><Trash2 size={13} /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )},
  ];

  const set = (patch: Partial<CreateBanOliInput>) => setForm(f => ({ ...f, ...patch }));

  function PerlengkapanSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="">Pilih status...</option>
          {perlengkapanOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Rekap Data Ban & Aki</h1><p className="text-sm text-slate-500">Kelengkapan ban, oli, aki, dan perlengkapan armada</p></div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={() => resetForm()}><Plus size={16} /> Tambah Data</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit Data Ban & Aki" : "Catat Data Ban & Aki"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mobil</label>
                <select value={form.carId} onChange={e => set({ carId: e.target.value })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" required>
                  <option value="">Pilih mobil...</option>
                  {cars.filter(c => !editing || c.id === editing.carId || !records.find(r => r.carId === c.id)).map(c => <option key={c.id} value={c.id}>{c.platMobil} — {c.jenisMobil}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Tempat" value={form.tempatSupir ?? ""} onChange={e => set({ tempatSupir: e.target.value })} />
                <Input label="Supir" value={form.driver ?? ""} onChange={e => set({ driver: e.target.value })} />
              </div>
              <p className="text-sm font-medium text-slate-700">5 Kode Ban & Tanggal</p>
              <div className="grid grid-cols-5 gap-2">
                {[["D. Kanan", "kodeBanDKanan", "tglBanDKanan"], ["D. Kiri", "kodeBanDKiri", "tglBanDKiri"], ["B. Kanan", "kodeBanBKanan", "tglBanBKanan"], ["B. Kiri", "kodeBanBKiri", "tglBanBKiri"], ["Serep", "kodeBanSerep", "tglBanSerep"]].map(([label, kKode, kTgl]) => (
                  <div key={label as string} className="space-y-1">
                    <Input label={label as string} value={(form as any)[kKode as string] ?? ""} onChange={e => set({ [kKode]: e.target.value })} />
                    <Input type="date" value={toInputDate((form as any)[kTgl as string])} onChange={e => set({ [kTgl]: e.target.value ? new Date(e.target.value) : undefined })} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <PerlengkapanSelect label="Dongkrak" value={form.dongkrak ?? ""} onChange={v => set({ dongkrak: v })} />
                <PerlengkapanSelect label="Kunci Roda" value={form.kunciRoda ?? ""} onChange={v => set({ kunciRoda: v })} />
              </div>
              <p className="text-sm font-medium text-slate-700">Update KM & Oli</p>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Update KM" type="number" value={form.updateKm ?? ""} onChange={e => set({ updateKm: e.target.value ? parseInt(e.target.value) : undefined })} />
                <Input label="Tgl Update KM" type="date" value={toInputDate(form.updateKmTgl)} onChange={e => set({ updateKmTgl: e.target.value ? new Date(e.target.value) : undefined })} />
                <Input label="Kartu Ganti Oli" value={form.kmKartuGantiOli ?? ""} onChange={e => set({ kmKartuGantiOli: e.target.value })} placeholder="60.000 (Free)" />
                <Input label="Tgl Ganti Oli" type="date" value={toInputDate(form.tglKartuGantiOli)} onChange={e => set({ tglKartuGantiOli: e.target.value ? new Date(e.target.value) : undefined })} />
              </div>
              <p className="text-sm font-medium text-slate-700">Komponen</p>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Tgl Aki" type="date" value={toInputDate(form.tglAki)} onChange={e => set({ tglAki: e.target.value ? new Date(e.target.value) : undefined })} />
                <Input label="Tgl Wiper" type="date" value={toInputDate(form.tglWiper)} onChange={e => set({ tglWiper: e.target.value ? new Date(e.target.value) : undefined })} />
              </div>
              <Input label="Service Lain (detail)" value={form.serviceLain ?? ""} onChange={e => set({ serviceLain: e.target.value })} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Keterangan</label>
                <textarea value={form.keterangan ?? ""} onChange={e => set({ keterangan: e.target.value })} className="h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Batal</Button>
                <Button type="submit" disabled={upsertMut.isPending}>{upsertMut.isPending && <Loader2 size={14} className="animate-spin" />} Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar Search + Filter */}
      <div className="flex items-center justify-end gap-3 mb-4 w-full">
        <div className="relative w-72 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Cari plat, posisi, atau supir..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm" />
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter Ban & Aki</p>
              <SelectFilter label="Plat Mobil" value={filterPlat} onChange={setFilterPlat} options={platOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Tahun" value={filterTahun} onChange={setFilterTahun} options={tahunOptions.map(v => ({ value: String(v), label: String(v) }))} />
              <SelectFilter label="Transmisi" value={filterTransmisi} onChange={setFilterTransmisi} options={transmisiOptions.map(v => ({ value: v, label: v }))} />
              <SelectFilter label="Posisi / User" value={filterPosisi} onChange={setFilterPosisi} options={posisiOptions.map(v => ({ value: v!, label: v! }))} />
              <SelectFilter label="Supir" value={filterDriver} onChange={setFilterDriver} options={driverOptions.map(v => ({ value: v!, label: v! }))} />
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => document.body.click()}>Terapkan</Button>
                <Button size="sm" variant="outline" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DataTable columns={columns} data={filtered} hideSearch emptyTitle="Belum ada data ban & aki" />

      {/* Detail Modal */}
      <Dialog open={!!detailTarget} onOpenChange={v => !v && setDetailTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detail Ban & Aki</DialogTitle></DialogHeader>
          {detailTarget && (
            <div className="space-y-5 text-sm">
              {/* Header — Data Armada */}
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xl font-bold text-slate-800">{detailTarget.platMobil}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">{detailTarget.jenisMobil}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-600">Tahun: {detailTarget.jenisMobil.split(" ").pop()}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-600">Transmisi: {detailTarget.jenisMobil.includes("A/T") ? "A/T" : "M/T"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700">{detailTarget.tempatSupir ?? "-"}</p>
                    <p className="text-xs text-slate-500">{detailTarget.driver ?? "-"}</p>
                  </div>
                </div>
              </div>

              {/* Section 1 — 5 Posisi Ban */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Kode & Tanggal Ban</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    ["D.KANAN", detailTarget.kodeBanDKanan, detailTarget.tglBanDKanan],
                    ["D.KIRI", detailTarget.kodeBanDKiri, detailTarget.tglBanDKiri],
                    ["B.KANAN", detailTarget.kodeBanBKanan, detailTarget.tglBanBKanan],
                    ["B.KIRI", detailTarget.kodeBanBKiri, detailTarget.tglBanBKiri],
                    ["SEREP", detailTarget.kodeBanSerep, detailTarget.tglBanSerep],
                  ].map(([l, k, t]) => (
                    <div key={l as string} className="rounded-lg border border-slate-100 bg-white p-3 text-center shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l as string}</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-800">{String(k ?? "-")}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{t ? formatDate(t) : ""}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2 — Tracking Odometer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Update KM</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-600">Odometer</span><span className="font-mono font-medium text-slate-800">{detailTarget.updateKm?.toLocaleString("id-ID") ?? "-"} km</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Tgl Update</span><span className="text-slate-500">{formatDate(detailTarget.updateKmTgl)}</span></div>
                    <div className="mt-2 border-t border-slate-50 pt-2">
                      <div className="flex justify-between"><span className="text-slate-600">KM Kartu Oli</span><span className="font-mono text-slate-800">{detailTarget.kmKartuGantiOli ?? "-"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Tgl Kartu Oli</span><span className="text-slate-500">{formatDate(detailTarget.tglKartuGantiOli)}</span></div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Aki & Wiper</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-600">Aki</span><span className="font-mono font-medium text-slate-800">{formatDate(detailTarget.tglAki)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Wiper</span><span className="font-mono text-slate-800">{formatDate(detailTarget.tglWiper)}</span></div>
                  </div>
                </div>
              </div>

              {/* Section 3 — Service & Perlengkapan */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Servis Lain-lain</p>
                  <p className="text-xs text-slate-700">{detailTarget.serviceLain || "-"}</p>
                  {detailTarget.keterangan && (
                    <div className="mt-2 rounded-md bg-amber-50/50 p-2">
                      <p className="text-[10px] font-medium text-amber-700">Catatan</p>
                      <p className="mt-0.5 text-xs italic text-slate-600">{detailTarget.keterangan}</p>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Perlengkapan</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Dongkrak</span>
                      {perlengkapanBadge(detailTarget.dongkrak)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Kunci Roda</span>
                      {perlengkapanBadge(detailTarget.kunciRoda)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Data</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Yakin ingin menghapus data ini?</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting && <Loader2 size={14} className="animate-spin" />} Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}