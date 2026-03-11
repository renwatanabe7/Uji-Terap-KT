import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Database, 
  AlertTriangle, 
  ChevronRight, 
  Download, 
  Loader2,
  History,
  Info,
  ExternalLink,
  Copy,
  Check,
  FileDown,
  Printer
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { generatePhytosanitaryReport } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisHistory {
  id: string;
  timestamp: string;
  optk: string;
  media: string;
  issue: string;
  report: string;
}

const COMMON_ISSUES = [
  { label: "-- Pilih Masalah Umum (Opsional) --", value: "" },
  { label: "Kehadiran OPTK pada Komoditas (Presence of Pests)", value: "Deteksi kehadiran OPTK hidup pada saat pemeriksaan fisik di negara tujuan." },
  { label: "Ketidaksesuaian Protokol Perlakuan (Treatment Non-compliance)", value: "Kegagalan memenuhi parameter teknis perlakuan (suhu, durasi, dosis) sesuai protokol negara tujuan." },
  { label: "Kontaminasi Tanah atau Gulma (Soil/Weed Contamination)", value: "Ditemukan kontaminasi tanah atau biji gulma yang dilarang pada media pembawa." },
  { label: "Masalah Sertifikat Fitosanitari (PC Issues)", value: "Kesalahan redaksional, tambahan deklarasi yang kurang, atau PC yang tidak diakui." },
  { label: "Pelanggaran Standar ISPM 15 (Wood Packaging)", value: "Kemasan kayu tidak memiliki marking ISPM 15 atau ditemukan hama hidup pada kayu." },
  { label: "Residu Pestisida di Atas MRL (Pesticide Residue)", value: "Kandungan residu pestisida melebihi batas maksimum (MRL) yang ditetapkan negara pengimpor." },
  { label: "Kurangnya Bukti Traceability (Traceability Issues)", value: "Ketidakmampuan membuktikan asal usul komoditas dari kebun/packing house yang teregistrasi." },
  { label: "Penolakan Status Area Bebas OPTK (PFA Rejection)", value: "Negara tujuan tidak mengakui status Area Bebas (Pest Free Area) yang diklaim oleh negara asal." },
  { label: "Lainnya (Tulis Manual)", value: "custom" }
];

export default function App() {
  const [optk, setOptk] = useState('');
  const [media, setMedia] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eppoData, setEppoData] = useState<any>(null);
  const [searchingEppo, setSearchingEppo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('phytosanitary_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const lookupEppo = async () => {
    if (!optk) return;
    setSearchingEppo(true);
    try {
      const res = await fetch(`/api/eppo/search?q=${encodeURIComponent(optk)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        // Get details for the first match
        const detailsRes = await fetch(`/api/eppo/taxon/${data[0].eppocode}`);
        const details = await detailsRes.json();
        setEppoData(details);
      } else {
        setEppoData({ error: "Tidak ditemukan di EPPO" });
      }
    } catch (err) {
      console.error("EPPO Lookup failed:", err);
      setEppoData({ error: "EPPO Token belum dikonfigurasi" });
    } finally {
      setSearchingEppo(false);
    }
  };

  const handleIssueSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedIssue(val);
    if (val !== "custom" && val !== "") {
      setIssue(val);
    } else if (val === "") {
      setIssue("");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Allow generation if at least one field is filled
    if (!optk && !media && !issue) {
      alert("Mohon isi setidaknya satu parameter (OPTK, Media, atau Masalah) untuk memulai analisis.");
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const result = await generatePhytosanitaryReport(optk, media, issue, eppoData);
      if (result) {
        setReport(result);
        const newEntry: AnalysisHistory = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('id-ID'),
          optk,
          media,
          issue,
          report: result
        };
        const updatedHistory = [newEntry, ...history].slice(0, 10);
        setHistory(updatedHistory);
        localStorage.setItem('phytosanitary_history', JSON.stringify(updatedHistory));
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Terjadi kesalahan saat menghasilkan laporan. Pastikan API Key sudah terkonfigurasi.");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (entry: AnalysisHistory) => {
    setOptk(entry.optk);
    setMedia(entry.media);
    setIssue(entry.issue);
    setReport(entry.report);
    setShowHistory(false);
  };

  const copyToClipboard = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    openInNewTab(true);
  };

  const openInNewTab = (autoPrint = false) => {
    const reportElement = document.querySelector('.report-container');
    if (!reportElement) return;

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert("Popup diblokir. Silakan izinkan popup untuk membuka laporan di tab baru.");
      return;
    }

    const title = `Laporan Karantina - ${optk || 'Analisis'}`;
    
    newWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            
            body { 
              font-family: 'Inter', -apple-system, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              padding: 2cm;
              max-width: 21cm;
              margin: 0 auto;
              background: #fff;
            }
            
            h1 { 
              color: #064e3b; 
              font-size: 28pt; 
              font-weight: 800;
              border-bottom: 3px solid #10b981; 
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            
            h2 { 
              color: #065f46; 
              font-size: 18pt;
              font-weight: 700;
              margin-top: 40px; 
              margin-bottom: 15px;
              border-left: 6px solid #10b981; 
              padding-left: 20px; 
            }
            
            h3 {
              color: #374151;
              font-size: 14pt;
              font-weight: 700;
              margin-top: 25px;
            }

            p { margin-bottom: 15px; text-align: justify; }

            .overflow-x-auto { width: 100%; overflow-x: visible; }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 25px 0; 
              border: 1px solid #e5e7eb;
              font-size: 10pt;
            }
            
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 12px; 
              text-align: left; 
              vertical-align: top;
            }
            
            th { 
              background-color: #f9fafb; 
              font-weight: bold;
              text-transform: uppercase;
              font-size: 9pt;
              color: #4b5563;
            }

            tr:nth-child(even) { background-color: #fcfcfc; }
            
            ul, ol { margin-bottom: 20px; padding-left: 30px; }
            li { margin-bottom: 8px; }

            .no-print { 
              margin-bottom: 30px; 
              padding: 15px; 
              background: #ecfdf5; 
              border: 1px solid #10b981; 
              border-radius: 10px; 
              font-size: 14px;
              color: #065f46;
            }

            @media print {
              body { padding: 0; margin: 0; width: 100%; }
              .no-print { display: none; }
              @page { margin: 2cm; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          ${!autoPrint ? `
          <div class="no-print">
            <strong>💡 Tips:</strong> Tekan <b>Ctrl + P</b> (atau Cmd + P) dan pilih <b>"Save as PDF"</b> untuk menyimpan laporan ini secara permanen.
          </div>
          ` : ''}
          <div class="report-content">
            ${reportElement.innerHTML}
          </div>
          ${autoPrint ? `
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                }, 500);
              };
            </script>
          ` : ''}
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const downloadAsWord = () => {
    if (!report) return;
    
    const reportElement = document.querySelector('.report-container');
    if (!reportElement) return;

    const htmlContent = reportElement.innerHTML;
    
    // Using a more robust Word-compatible HTML template
    const content = `
      <html xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Laporan Karantina</title>
        <style>
          v\\:* {behavior:url(#default#VML);}
          o\\:* {behavior:url(#default#VML);}
          w\\:* {behavior:url(#default#VML);}
          .shape {behavior:url(#default#VML);}
        </style>
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 2cm 2cm 2cm 2cm;
          }
          body { font-family: 'Calibri', 'Arial', sans-serif; }
          h1 { color: #065f46; font-size: 24pt; }
          h2 { color: #065f46; font-size: 18pt; border-bottom: 1px solid #065f46; padding-bottom: 5px; }
          table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Karantina_${(optk || 'Analisis').replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAsText = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Karantina_${(optk || 'Analisis').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 flex items-center justify-center">
              <img 
                src="https://karantinaindonesia.go.id/repository/main-web/media/65224b88-6146-4d03-953f-e723f2ebfca5.png.png" 
                alt="Logo Karantina Indonesia" 
                className="h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900">Karantina Uji Terap</h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Phytosanitary Analysis Tool</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600"
              title="Riwayat Analisis"
            >
              <History size={20} />
            </button>
            <div className="h-6 w-px bg-zinc-200 mx-2" />
            <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
              v1.0.5-stable
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-700">
                <Search size={16} />
                Parameter Input
              </h2>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between">
                  Nama OPTK (Ilmiah)
                  <button 
                    type="button" 
                    onClick={lookupEppo}
                    disabled={!optk || searchingEppo}
                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    {searchingEppo ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                    Cek EPPO
                  </button>
                </label>
                <input 
                  type="text" 
                  value={optk}
                  onChange={(e) => setOptk(e.target.value)}
                  placeholder="Contoh: Bactrocera dorsalis"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
                />
                {eppoData && (
                  <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-100 text-[11px] animate-in fade-in slide-in-from-top-1">
                    {eppoData.error ? (
                      <span className="text-zinc-400 italic">{eppoData.error}</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-zinc-600">EPPO Code:</span>
                          <span className="font-mono text-emerald-700">{eppoData.eppocode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-zinc-600">Status:</span>
                          <span className="text-zinc-500">{eppoData.status === 'A' ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="text-zinc-400 mt-1 italic">Data EPPO akan disertakan dalam analisis.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Media Pembawa</label>
                <input 
                  type="text" 
                  value={media}
                  onChange={(e) => setMedia(e.target.value)}
                  placeholder="Contoh: Buah Mangga Fresh"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Masalah / Kasus Khusus</label>
                <select
                  value={selectedIssue}
                  onChange={handleIssueSelect}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm mb-2"
                >
                  {COMMON_ISSUES.map((item, idx) => (
                    <option key={idx} value={item.value}>{item.label}</option>
                  ))}
                </select>
                
                {(selectedIssue === "custom" || selectedIssue === "" || issue !== "") && (
                  <textarea 
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="Jelaskan detail permasalahan di sini..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm resize-none animate-in fade-in slide-in-from-top-1"
                  />
                )}
              </div>

              <button 
                type="submit"
                disabled={loading || (!optk && !media && !issue)}
                className={cn(
                  "w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm",
                  loading 
                    ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Generate Laporan Teknis
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Quick Info */}
          <section className="bg-emerald-900 text-emerald-50 rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Standar ISPM</h3>
              <p className="text-sm text-emerald-200/90 leading-relaxed mb-4">
                Aplikasi ini menyelaraskan hasil penelitian dengan standar International Standards for Phytosanitary Measures (ISPM).
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium bg-white/10 px-3 py-2 rounded-lg border border-white/10">
                  <ChevronRight size={14} className="text-emerald-400" />
                  ISPM 15: Wood Packaging
                </div>
                <div className="flex items-center gap-2 text-xs font-medium bg-white/10 px-3 py-2 rounded-lg border border-white/10">
                  <ChevronRight size={14} className="text-emerald-400" />
                  ISPM 18: Irradiation
                </div>
                <div className="flex items-center gap-2 text-xs font-medium bg-white/10 px-3 py-2 rounded-lg border border-white/10">
                  <ChevronRight size={14} className="text-emerald-400" />
                  ISPM 28: Treatments
                </div>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <Database size={160} />
            </div>
          </section>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {report ? (
              <motion.div 
                key="report"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden print:border-none print:shadow-none"
              >
                <div className="p-4 border-b border-zinc-100 flex flex-wrap items-center justify-between bg-zinc-50/50 gap-4 no-print">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900">Laporan Analisis Teknis</h2>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">Generated on {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-emerald-600 transition-colors px-3 py-2 hover:bg-emerald-50 rounded-lg border border-zinc-200 bg-white"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                    
                    <button 
                      onClick={downloadAsText}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors px-3 py-2 hover:bg-zinc-50 rounded-lg border border-zinc-200 bg-white"
                      title="Download as Markdown/Text"
                    >
                      <FileText size={14} />
                      TXT
                    </button>

                    <button 
                      onClick={downloadAsWord}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-blue-600 transition-colors px-3 py-2 hover:bg-blue-50 rounded-lg border border-zinc-200 bg-white"
                    >
                      <FileDown size={14} />
                      Word
                    </button>

                    <button 
                      onClick={() => openInNewTab()}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-emerald-600 transition-colors px-3 py-2 hover:bg-emerald-50 rounded-lg border border-zinc-200 bg-white"
                      title="Buka di Tab Baru untuk Cetak/PDF"
                    >
                      <ExternalLink size={14} />
                      Tab Baru
                    </button>

                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors px-4 py-2 rounded-lg shadow-sm"
                    >
                      <Printer size={14} />
                      PDF / Print
                    </button>
                  </div>
                </div>
                
                <div className="p-10 report-container">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-8 rounded-xl border border-zinc-200 shadow-sm">
                          <table className="w-full border-collapse bg-white m-0">
                            {children}
                          </table>
                        </div>
                      )
                    }}
                  >
                    {report}
                  </ReactMarkdown>
                </div>
              </motion.div>
            ) : loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[600px] flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-2xl border border-zinc-200 border-dashed"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                    <Search size={24} />
                  </div>
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-lg font-bold text-zinc-900">Menjalankan Simulasi Pencarian</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Menghubungkan ke database ScienceDirect, CABI, EPPO, dan USDA untuk mengekstrak data efikasi terbaru...
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[600px] flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-2xl border border-zinc-200 border-dashed"
              >
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300">
                  <FileText size={40} />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-lg font-bold text-zinc-900">Belum Ada Analisis</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Masukkan nama ilmiah OPTK dan media pembawa di panel kiri untuk memulai tinjauan literatur dan analisis risiko teknis.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm px-4">
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 text-left">
                    <div className="text-emerald-600 mb-2"><Info size={18} /></div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Tips</p>
                    <p className="text-xs text-zinc-600">Gunakan nama ilmiah lengkap untuk hasil yang lebih akurat.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 text-left">
                    <div className="text-emerald-600 mb-2"><ExternalLink size={18} /></div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Sumber</p>
                    <p className="text-xs text-zinc-600">Data disimulasikan dari jurnal bereputasi internasional.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* History Sidebar Overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 border-l border-zinc-200 flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="text-emerald-600" size={20} />
                  <h2 className="font-bold text-zinc-900">Riwayat Analisis</h2>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <History size={48} className="mb-4" />
                    <p className="text-sm font-medium">Belum ada riwayat analisis</p>
                  </div>
                ) : (
                  history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => loadFromHistory(entry)}
                      className="w-full text-left p-4 rounded-xl border border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-zinc-400">{entry.timestamp}</span>
                        <ChevronRight size={14} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 mb-1 italic">{entry.optk}</h4>
                      <p className="text-xs text-zinc-500 truncate">Media: {entry.media}</p>
                    </button>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="p-4 border-t border-zinc-100">
                  <button 
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('phytosanitary_history');
                    }}
                    className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Hapus Semua Riwayat
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-8 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <img 
              src="https://karantinaindonesia.go.id/repository/main-web/media/65224b88-6146-4d03-953f-e723f2ebfca5.png.png" 
              alt="Logo Karantina Indonesia" 
              className="h-5 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-medium">Karantina Uji Terap &copy; 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-emerald-600 transition-colors">Dokumentasi</a>
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-emerald-600 transition-colors">Standar ISPM</a>
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-emerald-600 transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
