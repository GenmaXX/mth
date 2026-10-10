"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Plus, Upload, MoreHorizontal, Eye, Pencil, Trash2, Loader2, ListFilter, Search, ImageIcon, X, Car, CheckCircle, AlertTriangle, OctagonAlert } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { parseExcelCurrency, parseExcelDate } from "@/lib/excel";
import { formatRupiah } from "@/lib/tax-calculator";
import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/tables/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getCars,
  createCar,
  updateCar,
  deleteCar,
  updateStnkUrl,
  importCarsFromExcel,
  type CarRow,
  type CreateCarInput,
} from "./actions";

const transmisiOptions = [
  { value: "Manual", label: "Manual" },
  { value: "Automatic", label: "Automatic" },
];

const defaultForm: CreateCarInput = {
  jenisMobil: "",
  transmisi: "Manual",
  tahun: new Date().getFullYear(),
  platMobil: "",
  masaBerlakuStnk: null,
  hargaPerpanjangStnk: 0,
};

export function CarsClient({ cars: initial }: { cars: CarRow[] }) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: cars } = useQuery({
    queryKey: ["cars"],
    queryFn: getCars,
    initialData: initial,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCarInput>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<CarRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stnkUploadRef = useRef<HTMLInputElement>(null);
  const [uploadingCarId, setUploadingCarId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // filter & sort state
  const [filterJenis, setFilterJenis] = useState("");
  const [filterTransmisi, setFilterTransmisi] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortStnk, setSortStnk] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = [filterJenis, filterTransmisi, filterTahun, filterStatus].filter(Boolean).length;

  function resetFilters() {
    setFilterJenis("");
    setFilterTransmisi("");
    setFilterTahun("");
    setFilterStatus("");
    setSortStnk("");
  }

  // computed unique options
  const jenisOptions = useMemo(() => {
    const set = new Set(cars.map((c) => c.jenisMobil));
    return Array.from(set).sort();
  }, [cars]);

  const tahunOptions = useMemo(() => {
    const set = new Set(cars.map((c) => c.tahun));
    return Array.from(set).sort((a, b) => b - a);
  }, [cars]);

  const statusOptions = [
    { value: "aman", label: "Aman" },
    { value: "warning", label: "Warning" },
    { value: "critical", label: "Critical" },
    { value: "expired", label: "Expired" },
    { value: "no_stnk", label: "Belum Ada Data STNK" },
  ];

  function getStnkDaysLeft(date: Date | string | null) {
    if (!date) return NaN;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function getStatusKey(date: Date | string | null): string {
    if (!date) return "no_stnk";
    const d = getStnkDaysLeft(date);
    if (d < 0) return "expired";
    if (d <= 7) return "critical";
    if (d <= 30) return "warning";
    return "aman";
  }

  const filteredCars = useMemo(() => {
    let result = [...cars];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.platMobil.toLowerCase().includes(q) ||
          c.jenisMobil.toLowerCase().includes(q)
      );
    }
    if (filterJenis) result = result.filter((c) => c.jenisMobil === filterJenis);
    if (filterTransmisi) result = result.filter((c) => c.transmisi === filterTransmisi);
    if (filterTahun) result = result.filter((c) => c.tahun === Number(filterTahun));
    if (filterStatus) result = result.filter((c) => getStatusKey(c.masaBerlakuStnk) === filterStatus);
    if (sortStnk === "asc") {
      result.sort((a, b) => {
        const da = a.masaBerlakuStnk ? new Date(a.masaBerlakuStnk).getTime() : Infinity;
        const db = b.masaBerlakuStnk ? new Date(b.masaBerlakuStnk).getTime() : Infinity;
        return da - db;
      });
    } else if (sortStnk === "desc") {
      result.sort((a, b) => {
        const da = a.masaBerlakuStnk ? new Date(a.masaBerlakuStnk).getTime() : -Infinity;
        const db = b.masaBerlakuStnk ? new Date(b.masaBerlakuStnk).getTime() : -Infinity;
        return db - da;
      });
    }
    return result;
  }, [cars, searchQuery, filterJenis, filterTransmisi, filterTahun, filterStatus, sortStnk]);

  const stnkStats = useMemo(() => {
    const total = cars.length;
    const aman = cars.filter((c) => getStnkDaysLeft(c.masaBerlakuStnk) > 30).length;
    const kritis = cars.filter((c) => {
      const d = getStnkDaysLeft(c.masaBerlakuStnk);
      return d > 0 && d <= 30;
    }).length;
    const mati = cars.filter((c) => {
      const d = getStnkDaysLeft(c.masaBerlakuStnk);
      return isNaN(d) || d <= 0;
    }).length;
    const jenisCount = new Map<string, number>();
    for (const c of cars) {
      jenisCount.set(c.jenisMobil, (jenisCount.get(c.jenisMobil) || 0) + 1);
    }
    const sortedJenis = [...jenisCount.entries()].sort((a, b) => b[1] - a[1]);
    return { total, aman, kritis, mati, sortedJenis };
  }, [cars]);

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  const createMut = useMutation({
    mutationFn: createCar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success("Mobil baru ditambahkan");
    },
    onError: () => toast.error("Gagal menyimpan data"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCarInput }) =>
      updateCar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success("Data mobil diperbarui");
    },
    onError: () => toast.error("Gagal menyimpan data"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success("Mobil berhasil dihapus");
    },
    onError: () => toast.error("Gagal menghapus data"),
  });

  async function handleStnkUpload(e: React.ChangeEvent<HTMLInputElement>, carId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCarId(carId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { toast.error("Gagal upload file"); return; }
      const { url } = await res.json();
      await updateStnkUrl(carId, url);
      await qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success("Foto STNK berhasil diupload");
      router.refresh();
    } catch {
      toast.error("Gagal upload file");
    } finally {
      setUploadingCarId(null);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, data: form });
      } else {
        await createMut.mutateAsync(form);
      }
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(car: CarRow) {
    setForm({
      jenisMobil: car.jenisMobil,
      transmisi: car.transmisi,
      tahun: car.tahun,
      platMobil: car.platMobil,
      masaBerlakuStnk: car.masaBerlakuStnk ? new Date(car.masaBerlakuStnk) : null,
      hargaPerpanjangStnk: car.hargaPerpanjangStnk,
    });
    setEditingId(car.id);
    setDialogOpen(true);
  }

  function handleDetail(car: CarRow) {
    router.push(`/cars/${car.id}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function getStnkBadge(dateStr: Date | string | null) {
    if (!dateStr) {
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
          None
        </span>
      );
    }
    const target = new Date(dateStr);
    const diffTime = target.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
          {diffDays < 0 ? `${Math.abs(diffDays)} Hr` : "0 Hr"}
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
          {diffDays} Hr
        </span>
      );
    }
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {diffDays} Hr
      </span>
    );
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      const rows: CreateCarInput[] = json
        .map((r) => {
          const plat = (r["Plat Mobil"] ?? "").toString().trim();
          if (!plat) return null;
          const rawDate = (r["Masa Berlaku STNK"] ?? "").toString().trim();
          let masaBerlakuStnk = new Date();
          if (rawDate) {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) masaBerlakuStnk = parsed;
          }
          return {
            jenisMobil: (r["Jenis Mobil"] ?? "").toString().trim() || "-",
            transmisi: (r["Transmisi"] ?? "").toString().trim() || "Manual",
            tahun: parseInt(r["Tahun"]?.toString() || "0", 10) || new Date().getFullYear(),
            platMobil: plat,
            masaBerlakuStnk,
            hargaPerpanjangStnk: parseFloat(r["Harga Perpanjang STNK"]?.toString() || "0") || 0,
          };
        })
        .filter(Boolean) as CreateCarInput[];
      if (rows.length === 0) {
        toast.error("File Excel kosong atau format tidak sesuai");
        return;
      }
      await importCarsFromExcel(rows);
      await qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success(`${rows.length} data berhasil diimport`);
      router.refresh();
    } catch {
      toast.error("Gagal membaca file Excel");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const columns: ColumnDef<CarRow>[] = [
    {
      id: "no",
      header: "No",
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return (
          <span className="font-medium text-slate-500 tabular-nums">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      id: "platMobil",
      header: "Plat Mobil",
      accessorKey: "platMobil",
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-slate-800 whitespace-nowrap">{getValue<string>()}</span>
      ),
    },
    {
      id: "tahun",
      header: "Tahun",
      accessorKey: "tahun",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
    },
    { id: "transmisi", header: "Transmisi", accessorKey: "transmisi" },
    { id: "jenisMobil", header: "Jenis Mobil", accessorKey: "jenisMobil" },
    {
      id: "masaBerlakuStnk",
      accessorKey: "masaBerlakuStnk",
      header: "Masa Berlaku STNK",
      sortingFn: (a, b) => {
        const av = a.original.masaBerlakuStnk;
        const bv = b.original.masaBerlakuStnk;
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return new Date(av).getTime() - new Date(bv).getTime();
      },
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium text-slate-700">
          {formatDate(row.original.masaBerlakuStnk)}
        </span>
      ),
    },
    {
      id: "statusStnk",
      header: "Status STNK",
      cell: ({ row }) => getStnkBadge(row.original.masaBerlakuStnk),
    },
    {
      id: "hargaPerpanjangStnk",
      header: "Harga Perpanjang",
      accessorKey: "hargaPerpanjangStnk",
      cell: ({ getValue }) => (
        <span className="font-mono tabular-nums text-slate-800">
          {formatRupiah(getValue<number>())}
        </span>
      ),
    },
    {
      id: "fotoStnk",
      header: "Foto STNK",
      cell: ({ row }) => {
        const car = row.original;
        const hasFoto = Boolean(car.stnkUrl?.trim());
        const isImage = hasFoto && /\.(jpg|jpeg|png|gif|webp)$/i.test(car.stnkUrl!);
        if (hasFoto && isImage) {
          return (
            <div className="relative group inline-block">
              <button
                onClick={() => setPreviewUrl(car.stnkUrl!)}
                className="overflow-hidden rounded-md border border-slate-200 cursor-pointer transition-opacity hover:opacity-80"
              >
                <img src={car.stnkUrl!} alt="STNK" className="w-14 h-10 object-cover" />
              </button>
              <label className="absolute -top-1.5 -right-1.5 cursor-pointer rounded-full bg-white p-0.5 shadow-sm border border-slate-200 opacity-0 transition-opacity group-hover:opacity-100">
                <Upload size={10} className="text-slate-500" />
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleStnkUpload(e, car.id)} />
              </label>
            </div>
          );
        }
        return (
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600">
            {uploadingCarId === car.id ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            Upload
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleStnkUpload(e, car.id)} />
          </label>
        );
      },
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Pencil size={14} />
              Edit Mobil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDetail(row.original)}>
              <Eye size={14} />
              Detail Unit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 size={14} />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Armada</h1>
          <p className="text-sm text-slate-500">
            Kelola data armada, STNK, dan dokumen kendaraan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={dialogOpen}
            onOpenChange={(v) => {
              setDialogOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} />
                Tambah Mobil
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Mobil" : "Tambah Mobil Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Jenis Mobil"
                  value={form.jenisMobil}
                  onChange={(e) => setForm({ ...form, jenisMobil: e.target.value })}
                  required
                />
                <Select
                  label="Transmisi"
                  options={transmisiOptions}
                  value={form.transmisi}
                  onChange={(e) => setForm({ ...form, transmisi: e.target.value })}
                />
                <Input
                  label="Tahun"
                  type="number"
                  value={form.tahun}
                  onChange={(e) =>
                    setForm({ ...form, tahun: parseInt(e.target.value) || 0 })
                  }
                  required
                />
                <Input
                  label="Plat Mobil"
                  value={form.platMobil}
                  onChange={(e) =>
                    setForm({ ...form, platMobil: e.target.value.toUpperCase() })
                  }
                  placeholder="B 1234 XYZ"
                  required
                />
                <Input
                  label="Masa Berlaku STNK"
                  type="date"
                  value={
                    form.masaBerlakuStnk instanceof Date
                      ? form.masaBerlakuStnk.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setForm({ ...form, masaBerlakuStnk: new Date(e.target.value) })
                  }
                  required
                />
                <Input
                  label="Harga Perpanjang STNK (Rp)"
                  type="number"
                  value={form.hargaPerpanjangStnk || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hargaPerpanjangStnk: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {editingId ? "Simpan" : "Tambah"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <div className="min-h-[128px] flex flex-col justify-between rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4 shadow-sm cursor-pointer transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Armada</p>
                  <p className="text-2xl font-bold text-blue-900">{stnkStats.total} Mobil</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white shadow-md shadow-blue-500/20">
                  <Car size={20} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="truncate">
                  {stnkStats.sortedJenis.slice(0, 3).map(([j, c], i) => (
                    <span key={j}>{i > 0 && " • "}{c} {j}</span>
                  ))}
                </span>
                {stnkStats.sortedJenis.length > 3 && (
                  <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md border border-blue-200 bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100">+{stnkStats.sortedJenis.length - 3} Lainnya</span>
                )}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Rincian Jenis Mobil</p>
            <div className="flex flex-wrap gap-1.5">
              {stnkStats.sortedJenis.map(([jenis, count]) => (
                <span key={jenis} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {count} {jenis}
                </span>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="min-h-[128px] flex flex-col justify-between rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">STNK Aman</p>
              <p className="text-2xl font-bold text-emerald-900">{stnkStats.aman} Unit</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <CheckCircle size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Masa berlaku masih panjang</p>
        </div>
        <button
          onClick={() => setFilterStatus(filterStatus === "warning" ? "" : "warning")}
          className="min-h-[128px] flex flex-col justify-between rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 shadow-sm text-left transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Segera Perpanjang</p>
              <p className="text-2xl font-bold text-amber-900">{stnkStats.kritis} Unit</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Jatuh tempo dlm 30 hari</p>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === "expired" ? "" : "expired")}
          className="min-h-[128px] flex flex-col justify-between rounded-xl border border-red-200/80 bg-gradient-to-br from-red-50 to-rose-50/60 p-4 shadow-sm text-left transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">STNK Mati</p>
              <p className="text-2xl font-bold text-red-900">{stnkStats.mati} Unit</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 text-white shadow-md shadow-red-500/20">
              <OctagonAlert size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Perlu tindakan segera</p>
        </button>
      </div>

      {/* Toolbar Filter & Sort */}
      <div className="flex items-center justify-end gap-3 mb-4 w-full">
        <div className="relative w-72 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Cari plat mobil..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800">
              <ListFilter size={14} />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={8} avoidCollisions={false} className="w-80 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter</p>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Jenis Mobil</label>
                <select
                  value={filterJenis}
                  onChange={(e) => setFilterJenis(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="">Semua</option>
                  {jenisOptions.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Transmisi</label>
                <select
                  value={filterTransmisi}
                  onChange={(e) => setFilterTransmisi(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="">Semua</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Tahun</label>
                <select
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="">Semua</option>
                  {tahunOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Status STNK</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="">Semua</option>
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Urutkan STNK</label>
                <select
                  value={sortStnk}
                  onChange={(e) => setSortStnk(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="">Default</option>
                  <option value="asc">Paling Dekat</option>
                  <option value="desc">Paling Lama</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => { document.body.click(); setFilterOpen(false); }}>
                  Terapkan
                </Button>
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DataTable
        columns={columns}
        data={filteredCars}
        hideSearch
        initialSorting={[{ id: "masaBerlakuStnk", desc: false }]}
        emptyTitle="Belum ada data armada"
        emptyAction={
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Import Data Excel
          </Button>
        }
      />

      {/* hidden file input — not shown in header but available for empty state */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Data Mobil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Yakin ingin menghapus{" "}
            <span className="font-semibold text-slate-900">{deleteTarget?.platMobil}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
          >
            <X size={24} />
          </button>
          <img
            src={previewUrl}
            alt="STNK Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}