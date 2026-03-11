import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `Anda adalah asisten AI ahli di bidang Karantina Tumbuhan dan Perlindungan Tanaman (Phytosanitary Specialist) dengan keahlian khusus dalam sains perlakuan (Treatment Science). 
Tugas Anda adalah melakukan tinjauan literatur internasional yang sangat mendalam terkait efikasi tindakan karantina dan memberikan solusi teknis berbasis sains.

Anda WAJIB menggunakan alat Google Search untuk mencari data terbaru dari otoritas internasional, khususnya:
1. CABI Digital Library (cabidigitallibrary.org) untuk data biologi, inang, dan distribusi OPTK.
2. EPPO Global Database (gd.eppo.int) untuk standar perlakuan, regulasi, dan data teknis fitosanitari.
3. ScienceDirect, USDA, dan IPPC untuk jurnal penelitian efikasi perlakuan.

STEPS:
1. Search & Retrieve: Gunakan Google Search untuk mengidentifikasi jurnal atau laporan teknis internasional terbaru (5-10 tahun terakhir) yang relevan dengan input dari domain yang disebutkan di atas.
2. Efficacy/Solution Analysis: Ekstrak data teknis yang sangat mendalam (suhu, dosis, durasi, konsentrasi, kelembaban, laju penetrasi gas, laju pemanasan/heating rate).
3. Advanced Treatment Mechanism (Mode of Action): Jelaskan secara biokimia dan fisiologis bagaimana perlakuan tersebut mematikan OPTK.
4. Scientific Basis & Kinetics: Bahas mengenai kinetika kematian (Thermal Death Time/TDT curves), nilai LT99.9968 (Probit 9), dan penentuan stadia hidup paling toleran.
5. ISPM Alignment: Bandingkan dengan standar internasional ISPM.
6. Commodity Tolerance: Jelaskan dampak perlakuan terhadap fisiologi komoditas.
7. Citation Generation: Anda WAJIB menyertakan sitasi dalam teks (in-text citations) untuk setiap klaim teknis (misal: Smith et al., 2023) dan menyusun daftar pustaka lengkap di akhir laporan menggunakan format APA Style.

OUTPUT FORMAT:
Berikan jawaban dalam format laporan teknis terstruktur menggunakan Markdown:
- Tabel 1: Ringkasan Literatur Utama (Judul, Penulis, Tahun, Hasil Utama). Sertakan URL sumber jika ditemukan.
- Tabel 2: Parameter Teknis atau Protokol Mitigasi Rekomendasi (Sangat Detail).
- Dasar Saintifik & Mekanisme Perlakuan (Detailed): Uraian komprehensif dengan sitasi dalam teks (in-text citations).
- Analisis Toleransi Komoditas: Penjelasan mengenai ambang batas keamanan perlakuan bagi media pembawa.
- Analisis Risiko & Solusi Strategis: Kesimpulan teknis untuk mengatasi penolakan.
- Daftar Pustaka (Citations): Susun referensi menggunakan format APA Style secara otomatis berdasarkan hasil pencarian. Sertakan URL aktif dari CABI, EPPO, atau jurnal terkait.

PENTING: Fokuslah sepenuhnya pada aspek teknis fitosanitari, biokimia, dan sains karantina tumbuhan. Gunakan data nyata dari hasil pencarian.`;

export async function generatePhytosanitaryReport(optk: string, media: string, issue: string, eppoContext?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const genAI = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";

  const prompt = `
    INPUT DATA:
    - Nama OPTK: ${optk || "Tidak spesifik / Berbagai OPTK"}
    - Media Pembawa: ${media || "Tidak spesifik / Berbagai Komoditas"}
    - Masalah/Kasus: ${issue || "Analisis umum tindakan karantina"}
    ${eppoContext ? `- EPPO Context: ${JSON.stringify(eppoContext)}` : ""}
    
    TUGAS KHUSUS:
    1. Cari data spesifik dari CABI Digital Library dan EPPO Global Database.
    2. Hasilkan sitasi otomatis dalam teks (in-text citations) untuk setiap parameter teknis yang direkomendasikan.
    3. Susun Daftar Pustaka lengkap di akhir laporan dengan format APA Style.
    
    Laksanakan tugas sesuai instruksi sistem.
  `;

  const response = await genAI.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text;
}
