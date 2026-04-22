import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Phone, CheckCircle2, BookOpen } from "lucide-react";

const evacuationTips = [
  {
    title: "Saat Gempa Berlangsung",
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
    tips: [
      "Jauhi gedung, tiang listrik, dan pohon",
      "Berhenti di tempat terbuka yang aman",
      "Jangan berlari saat ada gempa susulan",
      "Perhatikan potensi longsoran jika di daerah pegunungan",
    ],
  },
];

const emergencyContacts = [
  { name: "BPBD Bantul", phone: "0274-123456" },
  { name: "BPBD DIY", phone: "0274-555123" },
  { name: "PMI Bantul", phone: "0274-789012" },
  { name: "Polisi Bantul", phone: "110" },
  { name: "Damkar Yogyakarta", phone: "113" },
  { name: "RS Sardjito", phone: "0274-587333" },
];

const emergencyChecklist = [
  {
    item: "Kantong darurat dengan air mineral dan makanan ringan",
    done: false,
  },
  { item: "Senter dan baterai cadangan", done: false },
  { item: "Kotak P3K", done: false },
  { item: "Dokumen penting (fotokopi KTP, KK, akta)", done: false },
  { item: "Obat-obatan pribadi", done: false },
  { item: "Pakaian ganti dan selimut", done: false },
  { item: "Nomor darurat yang penting", done: false },
  { item: "Pengisian daya hp (powerbank)", done: false },
];

export default function EducationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-gray-50 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-red-600">
              Edukasi Gempa Bumi
            </h1>
            <p className="text-slate-500 dark:text-gray-400">
              Pelajari tips evakuasi dan SOP gempa bumi untuk kesiapan
              menghadapi bencana
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {evacuationTips.map((section, index) => (
              <Card
                key={index}
                className="border border-slate-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-gray-100">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.tips.map((tip, tipIndex) => (
                      <li
                        key={tipIndex}
                        className="flex items-start gap-2 px-4 py-2 bg-slate-50 dark:bg-gray-800/50 rounded-md border border-slate-100 dark:border-gray-800"
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-gray-300">
                          {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-slate-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-gray-100">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Checklist Kesiapsiagaan Darurat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
                  Siapkan barang-barang berikut dalam tas darurat:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {emergencyChecklist.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                    >
                      <div className="h-6 w-6 flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded"
                          // Note: In a real app, you'd use state to manage checked items
                        />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-gray-300">
                        {item.item}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-gray-100">
                  <Phone className="h-5 w-5 text-red-500" />
                  Kontak Darurat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {emergencyContacts.map((contact, index) => (
                    <div
                      key={index}
                      className="p-4 border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 rounded-lg flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-gray-100">
                          {contact.name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                          {contact.phone}
                        </p>
                      </div>
                      <a
                        href={`tel:${contact.phone.replace(/-/g, "")}`}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-amber-200 dark:border-amber-900/30 shadow-sm bg-amber-50 dark:bg-amber-900/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-400">
                    Important Reminder
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300/90">
                    Selalu perhatikan informasi dari sumber resmi seperti BMKG
                    dan BPBD. Jangan percaya informasi hoaks yang beredar di
                    media sosial saat terjadi bencana. Tetap tenang dan
                    bertindak sesuai prosedur yang sudah dipelajari.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
