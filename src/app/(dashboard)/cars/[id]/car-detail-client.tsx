"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateStnkUrl, upsertEtleViolation, deleteEtleViolation, updateEtleBuktiUrl, type CarDetail } from "../actions";
import { ArrowLeft, Car, Wrench, Battery, Shield, FileText, Upload, Eye, Calendar, Clock, FileSearch, ImageIcon, X, AlertTriangle, Gavel, Trash2 } from "lucide-react";
import { toast } from "sonner";

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function fmtRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const tabs = [
  { id: "posisi", label: "Posisi & Supir", icon: Car },
  { id: "stnk", label: "STNK & Pajak", icon: FileSearch },
  { id: "perawatan", label: "Riwayat Perawatan", icon: Wrench },
  { id: "banoli", label: "Ban, Aki & Kelengkapan", icon: Battery },
  { id: "info", label: "Dokumen & Kontrak", icon: Shield },
];

function BadgeDays({ days }: { days: number | null }) {
  if (days === null) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
        Belum Ada Data STNK
      </span>
    );
  }
  if (days <= 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
        {days < 0 ? `Lewat ${Math.abs(days)} Hari` : "Mati / Perlu Perpanjang"}
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
        Perpanjang ({days} Hari)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Aman ({days} Hari)
    </span>
  );
}

function statusBadge(val: string | null) {
  if (!val) return <span className="text-slate-400">-</span>;
  const v = val.toLowerCase();
  const isBad = v.includes("tdk") || v.includes("tidak");
  const isAlat = v.includes("alat") || v.includes("listrik");
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      isBad ? "bg-red-50 text-red-600" : isAlat ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-600"
    }`}>{val}</span>
  );
}

export function CarDetailClient({ data }: { data: CarDetail }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("posisi");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [etleLightbox, setEtleLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stnkFileInputRef = useRef<HTMLInputElement>(null);
  const [etleForm, setEtleForm] = useState(false);
  const etleFileRef = useRef<HTMLInputElement>(null);
  const [etleData, setEtleData] = useState({
    id: "",
    tanggalTilang: "",
    keterangan: "",
    lokasi: "",
    pelanggaran: "",
    nominalDenda: 0,
    statusBayar: "Belum Dibayar",
  });

  const daysUntilStnk = data.masaBerlakuStnk
    ? Math.ceil((new Date(data.masaBerlakuStnk).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const hasValidStnk = Boolean(data.stnkUrl && data.stnkUrl.trim().length > 0);

  async function handleStnkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) { toast.error("Gagal upload file"); e.target.value = ""; return; }
    const { url } = await res.json();
    await updateStnkUrl(data.id, url);
    toast.success("STNK berhasil diupload");
    router.refresh();
    e.target.value = "";
  }

  const totalBiayaServis = useMemo(
    () => data.maintenances.reduce((sum, m) => sum + m.nominal, 0),
    [data.maintenances]
  );

  const isImage = hasValidStnk && /\.(jpg|jpeg|png|gif|webp)$/i.test(data.stnkUrl!);

  const latestEtle = data.etleViolations[0] ?? null;

  async function handleEtleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await upsertEtleViolation({
      id: etleData.id || undefined,
      carId: data.id,
      tanggalTilang: etleData.tanggalTilang || null,
      keterangan: etleData.keterangan || null,
      lokasi: etleData.lokasi || null,
      pelanggaran: etleData.pelanggaran || null,
      nominalDenda: etleData.nominalDenda,
      statusBayar: etleData.statusBayar,
    });
    toast.success("Data tilang ETLE disimpan");
    setEtleForm(false);
    router.refresh();
  }

  async function handleEtleDelete(violationId: string) {
    if (!confirm("Hapus data tilang ETLE ini?")) return;
    await deleteEtleViolation(violationId);
    toast.success("Tilang ETLE dihapus");
    router.refresh();
  }

  async function handleEtleBuktiUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !latestEtle) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) { toast.error("Gagal upload file"); e.target.value = ""; return; }
    const { url } = await res.json();
    await updateEtleBuktiUrl(latestEtle.id, url);
    toast.success("Bukti ETLE berhasil diupload");
    router.refresh();
    e.target.value = "";
  }

  function openEtleForm(v: NonNullable<typeof latestEtle> | null) {
    if (v) {
      setEtleData({
        id: v.id,
        tanggalTilang: v.tanggalTilang ? v.tanggalTilang.split("T")[0] : "",
        keterangan: v.keterangan ?? "",
        lokasi: v.lokasi ?? "",
        pelanggaran: v.pelanggaran ?? "",
        nominalDenda: v.nominalDenda,
        statusBayar: v.statusBayar,
      });
    } else {
      setEtleData({ id: "", tanggalTilang: "", keterangan: "", lokasi: "", pelanggaran: "", nominalDenda: 0, statusBayar: "Belum Dibayar" });
    }
    setEtleForm(true);
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Back & Title */}
      <div className="flex items-center gap-3">
        <Link href="/cars" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Detail Armada</h1>
        </div>
      </div>

      {/* Vehicle Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {/* Left: Identity */}
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.platMobil}</p>
            <p className="mt-1.5 text-sm text-slate-500">
              <span className="font-medium text-slate-700">Jenis Mobil</span> : {data.jenisMobil}
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-medium text-slate-700">Tahun</span> : {data.tahun}
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-medium text-slate-700">Transmisi</span> : {data.transmisi}
            </p>
          </div>

          {/* Right: STNK Badge Summary */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {hasValidStnk ? (
              <a
                href={data.stnkUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
              >
                <Eye size={14} /> Lihat STNK
              </a>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100">
                <Upload size={14} /> Upload STNK
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleStnkUpload} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === "posisi" && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Posisi & Supir</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">Posisi / User</p>
                <p className="mt-1 text-sm text-slate-700">{data.position?.userPosisi ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">Supir</p>
                <p className="mt-1 text-sm text-slate-700">{data.position?.driverName ?? "—"}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stnk" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">STNK & Pajak</h2>

            {/* Countdown Card */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                  <Clock size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sisa Masa Berlaku</p>
                  <p className="text-lg font-bold text-slate-900">
                    {daysUntilStnk !== null ? `${daysUntilStnk} Hari Lagi` : "—"}
                  </p>
                  <BadgeDays days={daysUntilStnk} />
                </div>
              </div>
            </div>

            {/* Detail Tanggal, Biaya & Foto STNK */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Calendar size={16} className="text-slate-400" /> Masa Berlaku STNK
                </div>
                <p className="mt-1 text-base font-medium text-slate-900">{fmtDate(data.masaBerlakuStnk?.toISOString() ?? null)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileText size={16} className="text-slate-400" /> HARGA PERPANJANG
                </div>
                <p className="mt-1 text-base font-medium text-slate-900">{fmtRupiah(data.hargaPerpanjangStnk)}</p>
              </div>
            </div>

            {/* Preview Foto STNK */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Foto STNK</h3>
              {hasValidStnk && isImage ? (
                <div className="relative inline-block group">
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-shadow hover:shadow-md"
                  >
                    <img
                      src={data.stnkUrl!}
                      alt="STNK"
                      className="w-48 h-32 object-cover"
                    />
                  </button>
                  <label className="absolute top-2 right-2 cursor-pointer rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white">
                    Ganti Foto
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleStnkUpload} />
                  </label>
                  <div className="mt-2">
                    <a
                      href={data.stnkUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={14} /> Lihat STNK
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-center justify-center w-48 h-32 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                    <ImageIcon size={28} className="text-slate-300" />
                    <p className="mt-1.5 text-xs font-medium text-slate-400">Foto STNK Belum Diupload</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100">
                    <Upload size={16} /> + Upload Foto STNK
                    <input ref={stnkFileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleStnkUpload} />
                  </label>
                </div>
              )}
            </div>

            {/* ETLE Violation Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Gavel size={16} className="text-slate-400" /> Riwayat & Dokumentasi Tilang ETLE
                </h3>
                {latestEtle ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                    <AlertTriangle size={12} /> Ada Tilang Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                    Tidak Ada Tilang
                  </span>
                )}
              </div>

              {latestEtle ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tanggal Tilang</p>
                      <p className="text-sm font-medium text-slate-800">{fmtDate(latestEtle.tanggalTilang)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pelanggaran</p>
                      <p className="text-sm font-medium text-slate-800">{latestEtle.pelanggaran ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lokasi</p>
                      <p className="text-sm font-medium text-slate-800">{latestEtle.lokasi ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nominal Denda</p>
                      <p className="text-sm font-medium text-slate-800">{fmtRupiah(latestEtle.nominalDenda)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      latestEtle.statusBayar === "Lunas" || latestEtle.statusBayar === "Dibayar"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : latestEtle.statusBayar === "Tidak Ada"
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {latestEtle.statusBayar}
                    </span>
                  </div>
                  {latestEtle.keterangan && (
                    <p className="text-xs italic text-slate-500">{latestEtle.keterangan}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    {latestEtle.buktiUrl ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEtleLightbox(latestEtle.buktiUrl!)}
                          className="overflow-hidden rounded-md border border-slate-200 transition-opacity hover:opacity-80"
                        >
                          <img src={latestEtle.buktiUrl} alt="Bukti ETLE" className="w-20 h-14 object-cover" />
                        </button>
                        <label className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50">
                          Ganti Foto
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleEtleBuktiUpload} />
                        </label>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100">
                        <Upload size={14} /> Upload Foto / Surat ETLE
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleEtleBuktiUpload} />
                      </label>
                    )}
                    <button onClick={() => openEtleForm(latestEtle)} className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => handleEtleDelete(latestEtle.id)} className="text-xs font-medium text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Belum ada catatan tilang ETLE</p>
                  <button onClick={() => openEtleForm(null)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">+ Tambah Tilang</button>
                </div>
              )}
            </div>

            {/* ETLE Form Modal */}
            {etleForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEtleForm(false)}>
                <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-base font-semibold text-slate-900 mb-4">{etleData.id ? "Edit" : "Tambah"} Tilang ETLE</h3>
                  <form onSubmit={handleEtleSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Tanggal Tilang</label>
                      <input type="date" value={etleData.tanggalTilang} onChange={(e) => setEtleData({ ...etleData, tanggalTilang: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Jenis Pelanggaran</label>
                      <input value={etleData.pelanggaran} onChange={(e) => setEtleData({ ...etleData, pelanggaran: e.target.value })} placeholder="Ganjil Genap, Batas Kecepatan..." className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Lokasi</label>
                      <input value={etleData.lokasi} onChange={(e) => setEtleData({ ...etleData, lokasi: e.target.value })} placeholder="Lokasi pelanggaran" className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Nominal Denda (Rp)</label>
                      <input type="number" value={etleData.nominalDenda || ""} onChange={(e) => setEtleData({ ...etleData, nominalDenda: parseInt(e.target.value) || 0 })} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Status Pembayaran</label>
                      <select value={etleData.statusBayar} onChange={(e) => setEtleData({ ...etleData, statusBayar: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm">
                        <option value="Belum Dibayar">Belum Dibayar</option>
                        <option value="Lunas">Lunas</option>
                        <option value="Tidak Ada">Tidak Ada</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Keterangan</label>
                      <textarea value={etleData.keterangan} onChange={(e) => setEtleData({ ...etleData, keterangan: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-slate-200 px-2 text-sm py-1" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setEtleForm(false)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                      <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">Simpan</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ETLE Lightbox */}
            {etleLightbox && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEtleLightbox(null)}>
                <button onClick={() => setEtleLightbox(null)} className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"><X size={24} /></button>
                <img src={etleLightbox} alt="Bukti ETLE" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
              </div>
            )}

            {/* Lightbox Modal */}
            {lightboxOpen && hasValidStnk && isImage && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                onClick={() => setLightboxOpen(false)}
              >
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
                >
                  <X size={24} />
                </button>
                <img
                  src={data.stnkUrl!}
                  alt="STNK Full"
                  className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "perawatan" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Riwayat Perawatan</h2>
              <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800">
                Total : {fmtRupiah(totalBiayaServis)}
              </span>
            </div>
            {data.maintenances.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada catatan perawatan</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-700">Tanggal</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-700">Bengkel</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-700">Item Servis</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-700">Biaya</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-700">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.maintenances.map((m) => {
                      const items: string[] = [];
                      if (m.isOli) items.push("Oli"); if (m.isBan) items.push("Ban"); if (m.isAki) items.push("Aki");
                      if (m.isAc) items.push("AC"); if (m.isOr) items.push("OR"); if (m.isService) items.push("Service");
                      return (
                        <tr key={m.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50 last:border-0">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{fmtDate(m.tanggal)}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{m.bengkel}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {items.map((i) => (
                                <span key={i} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{i}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-800">{fmtRupiah(m.nominal)}</td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-sm italic text-slate-500">{m.keterangan ?? "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "banoli" && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Ban, Aki & Kelengkapan</h2>
            {!data.banOli ? (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada data ban & aki</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-5 gap-3">
                  {[
                    ["D.Kanan", data.banOli.kodeBanDKanan, data.banOli.tglBanDKanan],
                    ["D.Kiri", data.banOli.kodeBanDKiri, data.banOli.tglBanDKiri],
                    ["B.Kanan", data.banOli.kodeBanBKanan, data.banOli.tglBanBKanan],
                    ["B.Kiri", data.banOli.kodeBanBKiri, data.banOli.tglBanBKiri],
                    ["Serep", data.banOli.kodeBanSerep, data.banOli.tglBanSerep],
                  ].map(([l, k, t]) => (
                    <div key={l as string} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l as string}</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-800">{String(k ?? "-")}</p>
                      {t && <p className="mt-0.5 text-[11px] text-slate-500">{fmtDate(t)}</p>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">Update KM</p>
                    <p className="mt-1 font-mono text-xl font-bold text-slate-900">{data.banOli.updateKm?.toLocaleString("id-ID") ?? "-"} km</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtDate(data.banOli.updateKmTgl)}</p>
                    <p className="mt-3 text-sm text-slate-700"><span className="font-semibold">Kartu Oli</span> : {data.banOli.kmKartuGantiOli ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">Perlengkapan</p>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span className="font-semibold text-slate-700">Dongkrak</span> {statusBadge(data.banOli.dongkrak)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="font-semibold text-slate-700">Kunci</span> {statusBadge(data.banOli.kunciRoda)}
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="text-slate-700"><span className="font-semibold">Aki</span> : {fmtDate(data.banOli.tglAki)}</p>
                      <p className="text-slate-700"><span className="font-semibold">Wiper</span> : {fmtDate(data.banOli.tglWiper)}</p>
                    </div>
                  </div>
                </div>
                {data.banOli.serviceLain && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <span className="font-semibold text-slate-700">Service Lain</span>
                    <p className="mt-1 text-slate-600 italic">{data.banOli.serviceLain}</p>
                  </div>
                )}
                {data.banOli.keterangan && (
                  <p className="text-xs italic text-slate-500">{data.banOli.keterangan}</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "info" && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Dokumen & Kontrak</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <FileText size={28} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Asuransi</p>
                <p className="text-xs text-slate-400">Belum tersedia</p>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <FileText size={28} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Leasing</p>
                <p className="text-xs text-slate-400">Belum tersedia</p>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <FileText size={28} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Kontrak</p>
                <p className="text-xs text-slate-400">Belum tersedia</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}