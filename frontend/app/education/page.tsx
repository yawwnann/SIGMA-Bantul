"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, Phone, CheckCircle2, BookOpen, 
  ShieldAlert, Activity, Navigation, Info, ShieldCheck, Volume2
} from "lucide-react";

const evacuationTips = [
  {
    title: "Saat Gempa Berlangsung",
    icon: Activity,
    iconColor: "text-red-600 dark:text-red-400",
    bgIcon: "bg-red-50 dark:bg-red-900/20",
    tips: [
      "Jangan panik, tetap tenang",
      "Lindungi kepala dengan meja atau benda kokoh",
      "Jauhi jendela, cermin, dan benda yang bisa jatuh",
      "Jika di dalam ruangan, tetap di dalam dan lindungi diri",
      "Jangan gunakan lift saat gempa",
    ],
  },
  {
    title: "Setelah Gempa Berhenti",
    icon: ShieldCheck,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgIcon: "bg-emerald-50 dark:bg-emerald-900/20",
    tips: [
      "Periksa kondisi diri dan orang sekitar",
      "Waspadai gempa susulan",
      "Keluar bangunan dengan hati-hati",
      "Gunakan tangga darurat, bukan elevator",
      "Pergilah ke area terbuka yang jauh dari bangunan",
    ],
  },
  {
    title: "Di Luar Ruangan",
    icon: Navigation,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgIcon: "bg-blue-50 dark:bg-blue-900/20",
    tips: [
      "Jauhi gedung, tiang listrik, dan pohon",
      "Berhenti di tempat terbuka yang aman",
      "Jangan berlari saat ada gempa susulan",
      "Perhatikan potensi longsoran jika di daerah pegunungan",
    ],
  },
];

const emergencyContacts = [
  { name: "BPBD Bantul", phone: "0274-123456", desc: "Pusat Pengendalian Darurat" },
  { name: "BPBD DIY", phone: "0274-555123", desc: "Komando Bencana Provinsi" },
  { name: "PMI Bantul", phone: "0274-789012", desc: "Bantuan Medis Darurat" },
  { name: "Polisi Bantul", phone: "110", desc: "Keamanan dan Ketertiban" },
  { name: "Damkar Yogyakarta", phone: "113", desc: "Pemadam Kebakaran & Penyelamatan" },
  { name: "RS Sardjito", phone: "0274-587333", desc: "Rumah Sakit Rujukan Utama" },
];

const initialChecklist = [
  { id: 1, item: "Kantong darurat dengan air mineral & makanan ringan", done: false },
  { id: 2, item: "Senter dan baterai cadangan", done: false },
  { id: 3, item: "Kotak P3K (Pertolongan Pertama)", done: false },
  { id: 4, item: "Dokumen penting (fotokopi KTP, KK, akta)", done: false },
  { id: 5, item: "Obat-obatan pribadi yang rutin dikonsumsi", done: false },
  { id: 6, item: "Pakaian ganti dan selimut", done: false },
  { id: 7, item: "Uang tunai secukupnya", done: false },
  { id: 8, item: "Pengisi daya HP (Powerbank) terisi penuh", done: false },
];

export default function EducationPage() {
  const [checklist, setChecklist] = useState(initialChecklist);

  const toggleChecklist = (id: number) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const completedCount = checklist.filter(i => i.done).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8">
      <div className="container mx-auto px-4">
        {/* Header - Dashboard Style (Left Aligned) */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 mb-1">
            Edukasi & Mitigasi Bencana
          </h1>
          <p className="text-slate-600 dark:text-zinc-400">
            Pusat informasi Standar Operasional Prosedur dan persiapan menghadapi gempa bumi
          </p>
        </div>

        {/* Top Widgets - Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col justify-center">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex flex-col items-start gap-2">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none">
                    14
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">
                    Langkah SOP Evakuasi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col justify-center">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex flex-col items-start gap-2">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <BookOpen className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none">
                    {completedCount} / 8
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">
                    Checklist Kesiapan ({progress}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col justify-center">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex flex-col items-start gap-2">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                  <Volume2 className="h-5 w-5 text-rose-600 dark:text-rose-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none">
                    6
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">
                    Instansi Darurat
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content Area - SOP List (Takes 8 columns on desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 h-full">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                  SOP Gempa Bumi
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {evacuationTips.map((section, index) => {
                    const Icon = section.icon;
                    return (
                      <div key={index} className="flex flex-col border border-slate-100 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-950 overflow-hidden">
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
                          <div className={`p-1.5 rounded ${section.bgIcon}`}>
                            <Icon className={`h-4 w-4 ${section.iconColor}`} />
                          </div>
                          <h3 className="font-semibold text-sm text-slate-800 dark:text-zinc-100">
                            {section.title}
                          </h3>
                        </div>
                        <ul className="p-4 space-y-3">
                          {section.tips.map((tip, tipIdx) => (
                            <li key={tipIdx} className="flex items-start gap-2.5">
                              <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${section.iconColor}`} />
                              <span className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                {tip}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}

                  {/* Alert Widget inside SOP */}
                  <div className="flex flex-col border border-amber-200 dark:border-amber-900/30 rounded-lg bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-amber-100/50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/30">
                      <div className="p-1.5 rounded bg-amber-200 dark:bg-amber-800/50">
                        <Info className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      </div>
                      <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-400">
                        Perhatian Penting
                      </h3>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                        Selalu pantau sumber resmi seperti BMKG. Jangan percaya hoaks yang beredar di media sosial saat terjadi bencana. Tetap tenang dan bertindak rasional.
                      </p>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Area - Checklist & Contacts (Takes 4 columns on desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Checklist Widget */}
            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                    Tas Siaga Bencana
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {checklist.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => toggleChecklist(item.id)}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <div className={`flex items-center justify-center h-4 w-4 rounded shrink-0 ${
                        item.done ? "bg-blue-600 text-white" : "border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                      }`}>
                        {item.done && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span className={`text-xs ${
                        item.done ? "text-slate-400 dark:text-zinc-500 line-through" : "text-slate-700 dark:text-zinc-300"
                      }`}>
                        {item.item}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contacts Widget */}
            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                  Kontak Darurat
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {emergencyContacts.map((contact, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate">{contact.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{contact.desc}</p>
                      </div>
                      <a 
                        href={`tel:${contact.phone.replace(/-/g, "")}`}
                        className="ml-2 flex items-center justify-center h-7 px-2.5 bg-slate-200/50 dark:bg-zinc-800 hover:bg-slate-300/50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors shrink-0"
                      >
                        <Phone className="h-3 w-3 mr-1.5" />
                        {contact.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
