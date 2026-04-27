# SISTEM INFORMASI GEOGRAFIS UNTUK MANAJEMEN KRISIS

# BENCANA GEMPA BUMI DI BANTUL

# SKRIPSI

## Disusun untuk memenuhi sebagian persyaratan

## mencapai derajat Sarjana

## Disusun Oleh:

## Yuwananta Valencia Afshandy

## 2200018050

# PROGRAM STUDI S1 INFORMATIKA

# FAKULTAS TEKNOLOGI INDUSTRI

# UNIVERSITAS AHMAD DAHLAN

# HALAMAN JUDUL

# SISTEM INFORMASI GEOGRAFIS UNTUK MANAJEMEN KRISIS BENCANA

# GEMPA BUMI DI BANTUL

# SKRIPSI

## Disusun Oleh:

## YUWANANTA VALENCIA AFSHANDY

## 2200018050

# PROGRAM STUDI S1 INFORMATIKA

# FAKULTAS TEKNOLOGI INDUSTRI

# UNIVERSITAS AHMAD DAHLAN

```
ii
```

# LEMBAR PERSETUJUAN PEMBIMBING

# SKRIPSI

# JUDUL SKRIPSI (DITULIS SECARA SINGKAT DAN JELAS MAKSIMAL 20

# KATA)

## Dipersiapkan dan disusun oleh:

## NAMA MAHASISWA

## NIM

# Program Studi S1 Informatika

# Fakultas Teknologi Industri

# Universitas Ahmad Dahlan

## Telah disetujui oleh:

## Pembimbing

## Nama Pembimbing dengan Gelar

## NIP/NIPM.

```
iii
```

# LEMBAR PENGESAHAN

# SKRIPSI

# JUDUL SKRIPSI (DITULIS SECARA SINGKAT DAN JELAS MAKSIMAL 20

# KATA)

## Dipersiapkan dan disusun oleh:

## NAMA MAHASISWA

## NIM

## Telah dipertahankan di depan Dewan Penguji

## pada tanggal Hari Bulan Tahun

## dan dinyatakan telah memenuhi syarat

## Susunan Dewan Penguji

## Ketua : Nama Ketua Penguji dengan Gelar .......................................

## Penguji 1 : Nama Penguji 1 dengan Gelar .......................................

## Penguji 2 : Nama Penguji 2 dengan Gelar .......................................

## Yogyakarta, Hari Bulan Tahun

## Dekan Fakultas Teknologi Industri

## Universitas Ahmad Dahlan

## Nama Dekan FTI dengan Gelar

## NIP/NIPM.

```
iv
```

# LEMBAR PERNYATAAN KEASLIAN

# SURAT PERNYATAAN

Yang bertanda tangan di bawah ini:

Nama : ............................................................................................................

NIM : ............................................................................................................

Prodi : Informatika

Judul TA/Skripsi : ............................................................................................................

............................................................................................................

............................................................................................................

Dengan ini saya menyatakan bahwa Laporan Tugas Akhir ini tidak terdapat karya yang
pernah diajukan untuk memperoleh gelar Ahli Madya/Kesarjanaan di suatu Perguruan Tinggi,
dan sepanjang pengetahuan saya juga tidak terdapat karya atau pendapat yang pernah ditulis
atau diterbitkan oleh orang lain, kecuali yang secara tertulis diacu dalam naskah ini dan
disebutkan dalam daftar pustaka.

```
Yogyakarta, Hari Bulan Tahun
```

```
Mengetahui,
Dosen Pembimbing
```

```
Nama Dosen Pembimbing dengan Gelar
NIP/NIPM.
```

```
Yang menyatakan,
```

```
Nama Mahasiswa
NIM
```

```
v
```

# KATA PENGANTAR

Tuliskan kata pengantar disini.

```
vi
```

# DAFTAR ISI

## HALAMAN JUDUL ............................................................................................................................i

## LEMBAR PERSETUJUAN PEMBIMBING ........................................................................................... ii

## LEMBAR PENGESAHAN .................................................................................................................. iii

## LEMBAR PERNYATAAN KEASLIAN ................................................................................................. iv

## KATA PENGANTAR .......................................................................................................................... v

## DAFTAR ISI ..................................................................................................................................... vi

## DAFTAR GAMBAR ......................................................................................................................... vii

## DAFTAR TABEL (Jika Ada) ............................................................................................................ viii

## DAFTAR KODE PROGRAM (Jika Ada) ............................................................................................. ix

## DAFTAR LAMPIRAN ........................................................................................................................ x

## DAFTAR SINGKATAN DAN ARTI LAMBANG (Jika Diperlukan) ....................................................... xi

## ABSTRAK ....................................................................................................................................... xii

## BAB I. Pendahuluan ............................................................................................................... 13

## 1.1. Latar Belakang Masalah .............................................................................................. 13

## 1.2. Batasan Masalah Penelitian ........................................................................................ 14

## 1.3. Rumusan Masalah ....................................................................................................... 15

## 1.4. Tujuan Penelitian ......................................................................................................... 16

## 1.5. Manfaat Penelitian ...................................................................................................... 16

## BAB II. Tinjauan Pustaka ......................................................................................................... 17

## 2.1. Kajian Penelitian Terdahulu ........................................................................................ 17

## 2.2. Landasan Teori ............................................................................................................ 23

## BAB III. METODOLOGI PENELITIAN .......................................................................................... 28

## 3.1. Kerangka Kerja Penelitian ........................................................................................... 28

## 3.2. Metode Pengumpulan Data ........................................................................................ 28

## 3.3. Metode Analisis Data Kuantitatif ................................................................................ 30

## 3.4. Software Dan Hardware .............................................................................................. 33

## 3.5. Tahapan Penelitian ...................................................................................................... 34

## 3.6. Implementasi ............................................................................................................... 39

## 3.7. Pengujian ..................................................................................................................... 40

## BAB IV. HASIL DAN PEMBAHASAN ....................................................................................... 43

## 4.1. Contoh Sub Bab ............................................................... Error! Bookmark not defined.

## 4.2. Contoh Sub Bab ............................................................... Error! Bookmark not defined.

## BAB V. KESIMPULAN DAN SARAN ........................................................................................... 65

## 5.1. Kesimpulan .................................................................................................................. 65

## 5.2. Saran ............................................................................................................................ 65

## DAFTAR PUSTAKA ........................................................................................................................ 66

## LAMPIRAN ................................................................................................................................... 67

## Lampiran 1. Bukti Pernyataan Diterima (ACCEPTED) .............................................................. 67

## Lampiran 2. Bukti Terakreditasi atau Terindeks SCOPUS ........................................................ 67

## Lampiran 3. Bukti Bayar (untuk jurnal yang berbayar) ........................................................... 67

## vii

# DAFTAR GAMBAR

- Gambar 3. 1 ilustrasi Weighted Overlay dalam Analisis Resiko Jalur Evakuasi Gambar 1 Flowchart Error! Bookmark not defined.
- Gambar 3. 2 Alur Tahapan Penelitian
- Gambar 4. 1 Use Case Diagram
- Gambar 4. 2 Activity Diagram Penentuan Jalur Evakuasi
- Gambar 4. 3 Activity Diagram Manajemen Data Shelter
- Gambar 4. 4 Activity Diagram Visualisasi Peta Zona Bahaya Gempa
- Gambar 4. 5 Activity Diagram Pengelolaan Data Infrastruktur
- Gambar 4. 6 ERD (Entity Relationship Diagram)
- Gambar 4. 7 Sequence Diagram Pencarian Rute Evakuasi
- Gambar 4. 8 Sequence Diagram: Penerimaan Notifikasi Web Push
- Gambar 4. 9 Sequence Diagram Manajemen Data Shelter

```
viii
```

# DAFTAR TABEL

Tabel 2. 1 Kajian Penelitian Terdahulu ........................................................................................ 20
Tabel 3. 1 _Software_ dan _Hardware_ .............................................................................................. 33

## Tabel 4. 1 Kebutuhan Fungsional Sistem .................................................................................... 45

## Tabel 4. 2 Kebutuhan Non-Fungsional Sistem ............................................................................ 48

```
ix
```

# DAFTAR KODE PROGRAM (Jika Ada)

Kode Program 4.1. Menampilkan tulisan “Hello World!” ............... **Error! Bookmark not defined.**

```
x
```

# DAFTAR LAMPIRAN

### LAMPIRAN ................................................................................................................................... 67

```
Lampiran 1. Bukti Pernyataan Diterima (ACCEPTED) .............................................................. 67
Lampiran 2. Bukti Terakreditasi atau Terindeks SCOPUS ........................................................ 67
Lampiran 3. Bukti Bayar (untuk jurnal yang berbayar) ........................................................... 67
```

```
xi
```

# DAFTAR SINGKATAN DAN ARTI LAMBANG (Jika Diperlukan)

FTI : Fakultas Teknologi Industri

UAD : Universitas Ahmad Dahlan

dst

```
xii
```

# ABSTRAK

Penulisan abstrak sebagai berikut: 1) Menggunakan jarak antar baris 1 spasi, 2) Jenis Huruf ;
Calibri dengan ukuran 11, 3) Terdiri dari Tiga alinea/paragraph.
Abstrak berisi uraian singkat tetapi lengkap yang terdiri dari 250-300 kata dan memberikan
gambaran menyeluruh tentang isi skripsi. Abstrak terdiri dari 3 alinia, dengan cakupan: alinia 1
berisi tentang masalah, tujuan dan manfaat penelitian. Alinia 2 berisi tentang metode penelitian
yang mengacu pada bab 3. Alinia 3 berisi tentang temuan-temuan sebagai simpulan dari
pengujian yang dilalukan yang didukung dengan data-data kuantitatif hasil pengujian.
Pada akhir penulisan abstrak disertai dengan kata kunci 3 sampai 5 kata kunci diurutkan
berdasarkan abjad. Kata kunci merupakan kata yang menjadi fokus dalam penelitian yang
biasanya diambil dari judul Skripsi. Tiap kata kunci dipisahkan dengan tanda baca titik koma (;).

Kata kunci: kata kunci 1 ; kata kunci 2 ; kata kunci 3 ; kata kunci 4 ; kata kunci 5

# BAB I. Pendahuluan

**1.1. Latar Belakang Masalah**

Kabupaten Bantul, yang terletak di Provinsi Daerah Istimewa Yogyakarta, merupakan wilayah yang
sangat rentan terhadap bencana geologi, khususnya gempa bumi. Hal ini disebabkan oleh posisinya
yang berada dekat dengan zona subduksi aktif bagian selatan Pulau Jawa, yang melibatkan pertemuan
antara lempeng tektonik Indo-Australia dan Lempeng Eurasia. Wilayah Kabupaten Bantul memiliki
susunan geologi yang kompleks, yang meningkatkan potensi ancaman bencana gempa bumi[1].
Sejarah mencatat bahwa gempa besar yang mengguncang wilayah ini pada tahun 2006, menyebabkan
ribuan korban jiwa dan kerusakan infrastruktur yang luas, yang semakin mempertegas betapa
pentingnya upaya mitigasi bencana yang lebih efektif.

Gempa bumi adalah fenomena seismik getaran yang timbul di permukaan tanah dan disebabkan
oleh pelepasan energi mendadak dari dalam. Faktor penyebab utama termasuk interaksi lempeng
tektonik, pergerakan sesar aktif, aktivitas vulkanik, dan runtuhnya massa batuan. Sebagai bencana
alam, gempa bumi menyimpan sifat sangat merusak dan terjadi tiba-tiba dalam waktu yang singkat.
Kemungkinan terjadinya gempa bumi ini ada di sebagian besar daerah Indonesia, dengan rentang
magnitudo yang berkisar dari kecil sampai besar yang memiliki tingkat kekuatan destruktif yang
tinggi[2]. Dampak sosialnya terlihat pada gangguan kegiatan sosial dan ekonomi masyarakat, serta
gangguan psikologis yang menyebabkan trauma yang berlangsung lama. Oleh karena itu, sistem
manajemen krisis yang efektif sangat diperlukan untuk meminimalkan dampak bencana tersebut.
Dalam hal ini, pemanfaatan teknologi informasi, khususnya Sistem Informasi Geografis (SIG), menjadi
sangat krusial dalam mendukung pengambilan keputusan yang cepat dan tepat.

SIG memiliki kemampuan untuk melakukan pengolahan data dan melakukan operasi - operasi
tertentu dengan menampilkan dan menganalisa data[3]. SIG memudahkan pengelola untuk mendata
dan mengetahui sebaran daerah rawan bencana yang ada[4]. Dengan adanya SIG informasi dapat
disampaikan dalam bentuk peta yang didalamnya terdapat informasi yang terkait dengan daerah
rawan bencana tersebut. Sebagai contoh, SIG dapat menyajikan informasi secara interaktif melalui
antarmuka peta digital, di mana pengguna dapat mengeklik titik atau area tertentu untuk melihat
informasi detail, menggunakan fitur pencarian lokasi, serta menyaring informasi berdasarkan kriteria
seperti tanggal kejadian atau tingkat kerusakan. Pendekatan ini memudahkan pemangku kebijakan
dan tim tanggap darurat dalam merespons situasi darurat secara cepat dan tepat.

Penelitian sebelumnya menunjukkan bahwa penerapan SIG di Kabupaten Bantul telah
memberikan kontribusi signifikan, seperti dalam penataan kawasan permukiman pasca-bencana dan
pengembangan peta interaktif untuk jalur evakuasi tsunami di wilayah pesisir[5]. Meskipun sudah ada
beberapa inisiatif penggunaan SIG, saat ini belum ada sistem pemetaan interaktif berbasis SIG yang
mengintegrasikan secara menyeluruh berbagai jenis data spasial dari instansi terkait, seperti peta
zonasi rawan gempa dari BPBD, data sesar aktif dari BMKG, dan data kependudukan dari BPS, ke dalam
satu platform visualisasi spasial yang terpadu dan mudah diakses. Hal ini menyebabkan proses
penanganan bencana di Kabupaten Bantul masih bersifat reaktif, kurangnya koordinasi antarinstansi,
serta rendahnya partisipasi masyarakat dalam sistem peringatan dini dan evakuasi, yang disebabkan
oleh keterbatasan akses terhadap informasi yang akurat dan mudah dipahami.

Oleh karena itu, pengembangan sistem informasi geografis untuk mendukung manajemen krisis
bencana gempa bumi di Kabupaten Bantul menjadi sangat relevan dan mendesak. Sistem ini
diharapkan mampu menyajikan data spasial secara interaktif dan terkini, yang dapat diakses dengan
mudah oleh masyarakat. Pendekatan interaktif semacam ini telah terbukti secara signifikan dapat
meningkatkan kesiapsiagaan masyarakat dan efektivitas latihan mitigasi bencana[6]. Melalui sistem
ini, koordinasi antarinstansi dapat ditingkatkan, dan kesiapsiagaan masyarakat dalam menghadapi
bencana dapat diperbaiki secara signifikan.

**1.2. Batasan Masalah Penelitian**

Agar penelitian ini dapat terfokus dan terarah sesuai dengan tujuan yang ingin dicapai, maka perlu
ditetapkan beberapa batasan masalah sebagai berikut:

1. Cakupan wilayah penelitian dibatasi pada wilayah administratif Kabupaten Bantul, Daerah
   Istimewa Yogyakarta. Representasi spasial dalam sistem ini hanya mencakup wilayahwilayah
   yang dikategorikan rawan gempa bumi berdasarkan data dari BMKG dan instansi terkait (tidak
   mencakup wilayah lain di luar area tersebut).
2. Jenis bencana yang menjadi fokus penelitian terbatas pada bencana gempa bumi. Penelitian
   ini tidak membahas bentuk bencana lainnya seperti banjir, tanah longsor, atau erupsi gunung
   berapi.
3. Sistem yang dikembangkan merupakan sistem pemetaan interaktif berbasis Sistem Informasi
   Geografis (SIG) yang menampilkan informasi spasial tentang:
   a) Daerah rawan gempa bumi

```
b) Titik evakuasi
c) Jalur evakuasi
d) Lokasi fasilitas umum penting (seperti rumah sakit, sekolah, dan kantor desa)
```

4. Sumber data yang digunakan dalam pengembangan sistem diperoleh dari instansi terkait
   seperti BPBD Kabupaten Bantul, BMKG Yogyakarta, serta data sekunder dari literatur, peta
   zonasi, dan hasil observasi lapangan.
5. Pengguna sistem yang menjadi fokus utama adalah pemangku kepentingan (stakeholder)
   dalam penanggulangan bencana seperti BPBD, perangkat desa, dan masyarakat di zona rawan
   bencana. Sistem belum mencakup integrasi dengan sistem peringatan dini (early warning
   system) atau fitur mobile secara menyeluruh.
6. Aspek teknologi dibatasi pada pengembangan sistem berbasis web dengan memanfaatkan
   teknologi pemetaan (seperti Leaflet atau Google Maps API) dan basis data spasial yang
   sederhana. Sistem ini terbatas pada representasi data spasial dasar dan belum mencakup
   analisis prediktif berbasis machine learning.

Dengan pembatasan ini, diharapkan penelitian dapat dilakukan secara lebih terfokus dan
menghasilkan keluaran yang dapat diterapkan serta dikembangkan lebih lanjut pada penelitian atau
implementasi sistem di masa depan.

**1.3. Rumusan Masalah**

Berdasarkan latar belakang dan batasan masalah yang telah dijelaskan sebelumnya, maka rumusan
masalah dalam penelitian ini adalah sebagai berikut:

1. Bagaimana merancang dan mengembangkan sistem pemetaan interaktif berbasis Sistem
   Informasi Geografis (SIG) untuk mendukung manajemen krisis bencana gempa bumi di
   Kabupaten Bantul?
2. Sejauh mana efektivitas dan akurasi sistem pemetaan interaktif dalam menyajikan informasi
   spasial terkait daerah rawan bencana dan jalur evakuasi di wilayah tersebut?

Rumusan masalah ini akan menjadi dasar dalam menyusun tujuan penelitian, metodologi, dan
pengembangan sistem yang diusulkan dalam studi ini.

**1.4. Tujuan Penelitian**

Tujuan yang akan dicapai dalam penelitian diatas adalah :

1. Mengembangkan sistem pemetaan interaktif berbasis Sistem Informasi Geografis (SIG) untuk
   mendukung manajemen krisis bencana gempa bumi di Kabupaten Bantul, khususnya dalam
   penyajian informasi daerah rawan gempa, jalur evakuasi, titik evakuasi, dan fasilitas umum
   penting.
2. Mengevaluasi fungsionalitas, akurasi, dan kemudahan penggunaan sistem dalam menyajikan
   informasi spasial guna mendukung pengambilan keputusan yang cepat dan tepat bagi
   masyarakat serta pemangku kepentingan terkait.

**1.5. Manfaat Penelitian**

Penelitian ini diharapkan memberikan sejumlah manfaat yang signifikan bagi berbagai pihak yang
terlibat dalam penanganan dan mitigasi bencana gempa bumi di Kabupaten Bantul, antara lain:

1. Memberikan kemudahan akses informasi spasial terkait daerah rawan gempa bumi, jalur
   evakuasi, titik evakuasi, dan fasilitas umum penting di Kabupaten Bantul untuk mendukung
   kesiapsiagaan masyarakat dalam menghadapi bencana.
2. Membantu pemerintah daerah dan instansi terkait dalam pengambilan keputusan yang
   lebih cepat dan tepat pada kegiatan mitigasi serta penanganan bencana gempa bumi.
3. Menjadi referensi bagi pengembangan sistem informasi geografis berbasis web dalam
   manajemen krisis bencana di wilayah lain.

# BAB II. Tinjauan Pustaka

**2.1. Kajian Penelitian Terdahulu**

Penelitian ini berfokus pada pengembangan Sistem Informasi Geografis (SIG) untuk manajemen
krisis bencana gempa bumi, khususnya di wilayah Bantul. Untuk memberikan landasan yang kuat bagi
penelitian ini, tinjauan terhadap penelitian-penelitian terdahulu yang relevan sangat diperlukan. Kajian
ini bertujuan untuk mengidentifikasi kontribusi, metodologi, dan temuan dari studi-studi sebelumnya
yang berkaitan dengan SIG, manajemen bencana, dan gempa bumi, terutama yang berlokasi di
Indonesia dalam lima tahun terakhir. Hal ini juga akan membantu dalam mengidentifikasi celah
penelitian (research gap) dan posisi penelitian ini dibandingkan dengan penelitian sebelumnya.
Terdapat beberapa penelitian terdahulu yang menjadi referensi dalam melakukan penelitian ini, dan
perbedaan antara penelitian ini dan penelitian terdahulu akan diuraikan disini.
Penelitian oleh Firdaus, Soemitro Emin Praja, Lucke Ayurindra Margie Dayana (2025). Analisis
Pengurangan Risiko Bencana Gempa Bumi di Kabupaten Mimika Provinsi Papua Tengah. Penelitian ini
bertujuan untuk mengetahui tingkat ancaman, kerentanan, dan kapasitas gempa bumi, serta risiko
bencana gempa bumi dan upaya pengurangannya di Kabupaten Mimika[7]. Metode analisis yang
digunakan adalah deskriptif komparatif dengan data yang dikumpulkan melalui pengukuran
parameter, survei lapangan, dan analisis data sekunder. Perangkat yang digunakan adalah Sistem
Informasi Geografis (SIG). Hasil penelitian menunjukkan bahwa tingkat ancaman, kerentanan, dan
risiko bencana gempa bumi di Kabupaten Mimika tergolong tinggi, namun kapasitasnya rendah. Upaya
pengurangan risiko bencana perlu diperkuat melalui pembangunan infrastruktur tahan gempa dan
penyusunan rencana kontijensi.
Penelitian oleh Puspa Anggraeni, Nur Aini Dwi Kusumawardani, Farkhah Azzahra Rismawati,
Qinthar Tangkas Samudra, Abe Nugroho, Siti Azizah Susilawati (2024). Aplikasi sistem terintegrasi
bencana gempa bumi: _sistematic review berbasis lens_ dan _vosviewer[8]._ Penelitian ini bertujuan untuk
memetakan perkembangan penelitian penanggulangan gempa bumi secara terintegrasi, aplikasi, dan
sistem dengan menggunakan mesin pencari Lens selama lima tahun, dari tahun 2019 hingga 2024.
Penelitian ini menggunakan metode deskriptif kuantitatif dengan investigasi bibliometrik dan
literature review menggunakan software VosViewer. Hasil penelitian menunjukkan peningkatan
jumlah publikasi ilmiah terkait gempa bumi dari tahun 2019 hingga 2024.

```
Penelitian oleh Bagas Daniswara Adi Pangestu (2024). Evaluasi dampak penggunaan sistem
```

informasi geografis (SIG) dalam pengelolaan sumber daya alam dan pengalian kebijakan publik di

daerah rawan bencana alam[9]. Penelitian ini bertujuan untuk mengevaluasi dampak penggunaan

Sistem Informasi Geografis (SIG) dalam pengelolaan sumber daya alam dan pengurangan risiko

bencana di beberapa daerah yang rawan bencana di Indonesia. Metode yang digunakan mencakup

studi kasus, wawancara mendalam, diskusi kelompok terarah (FGD), dan observasi langsung. Hasil

penelitian menunjukkan bahwa SIG berperan penting dalam meningkatkan efisiensi pemetaan risiko

bencana, pengelolaan sumber daya alam, serta mendukung perencanaan ruang yang lebih

berkelanjutan.

```
Penelitian oleh Melly Angglena, Fhandy Pandey (2025). Pemetaan zona rawan gempa berdasarkan
jejak historis gempa dan kerusakan infrastruktur[10]. Penelitian ini bertujuan untuk memetakan zona
rawan gempa berdasarkan data historis kejadian gempa bumi dan tingkat kerusakan infrastruktur,
guna mendukung upaya mitigasi bencana yang berbasis bukti. Data dianalisis menggunakan Sistem
Informasi Geografis (SIG) untuk mengidentifikasi pola persebaran gempa dan wilayah dengan tingkat
kerusakan tinggi.
Penelitian oleh Aisyah Nur Fikriyah, Dina Amanda Sari, Elisa Dwi Irvina, Hudan Hukiyanto, Irwan,
Marningot Tua Natalis Situmorang (2024). GIS Sebagai Alat untuk Perencanaan Evakuasi dan
Manajemen Krisis Bencana[11]. Penelitian ini menggunakan tinjauan literatur dan database Google
Scholar untuk membahas isu-isu GIS. Hasil dari penelitian ini menyimpulkan bahwa GIS sangat berguna
dalam manajemen bencana. Kemampuannya untuk menilai risiko, menganalisis data spasial,
menggabungkan berbagai informasi, dan menampilkan visualisasi sangat membantu dalam
pengambilan keputusan yang lebih baik serta mempercepat respons saat keadaan darurat.
Penelitian oleh Isnaini Muhandhis (2019). Sistem informasi geografis bencana gempa bumi dengan
pendekatan Pga untuk mitigasi bencana[12]. Penelitian ini menghasilkan sebuah sistem informasi
geografis berbasis web dengan script PHP dan MySQL sebagai pengelola basis datanya, yang dirancang
untuk mitigasi bencana gempa bumi. Meskipun tahun publikasinya 2019, relevansinya dengan topik
dan penggunaan SIG untuk mitigasi bencana gempa bumi menjadikannya referensi yang berharga.
Penelitian oleh Muhammad Khuluqin Adzim, Rusmini (2025). Manajemen bencana gempa bumi
pada tahap pra bencana di kota mataram provinsi nusa tenggara barat[13]. Penelitian ini berfokus
pada kerentanan Kota Mataram terhadap bencana gempa bumi dan pentingnya manajemen serta
```

kesiapan yang baik di tahap pra bencana. Metode penelitian yang digunakan adalah deskriptif kualitatif
dengan pengumpulan data melalui wawancara, observasi, dan dokumentasi. Hasil penelitian
menunjukkan bahwa BPBD Kota Mataram telah mengoptimalkan faktor manajemen bencana pada
tahap pra bencana.

```
Tabel 2. 1 Kajian Penelitian Terdahulu
Peneliti (Sitasi) * Judul Metode Objek Penelitian Tools Hasil*
```

**Firdaus dkk.** [7] Analisis
Pengurangan
Risiko Bencana
Gempa Bumi di
Kabupaten
Mimika Provinsi
Papua Tengah

```
Deskriptif
Komparatif
```

```
Tingkat ancaman,
kerentanan,
kapasitas, dan
risiko bencana
gempa bumi di
Kabupaten
Mimika
```

```
Sistem Informasi Geografis
(SIG)
```

```
Tingkat ancaman, kerentanan, dan risiko
bencana gempa bumi tinggi, kapasitas rendah.
Perlu penguatan infrastruktur tahan gempa
dan rencana kontijensi.
```

**Anggraeni dkk** [8] Aplikasi Sistem
Terintegrasi
Bencana Gempa
Bumi: Sistematic
Review Berbasis
Lens Dan
Vosviewer

```
Deskriptif
Kuantitatif
( Bibliometrik
& Literature
Review )
```

```
Perkembangan
penelitian
penanggulangan
gempa bumi
```

```
Lens, VosViewer Peningkatan jumlah publikasi ilmiah terkait
gempa bumi dari 2019-2024.
```

**Pangestu dkk** [9] Evaluasi Dampak
Penggunaan
Sistem Informasi
Geografis (Sig)
Dalam
Pengelolaan
Sumber Daya
Alam Dan
Pengalian
Kebijakan Publik
Di Daerah Rawan
Bencana Alam

```
Studi Kasus
(Wawancara,
FGD,
Observasi
Partisipatif)
```

```
Pengelolaan
sumber daya alam
dan mitigasi risiko
bencana di
wilayah rawan
bencana di
Indonesia
```

```
Sistem Informasi Geografis
(SIG)
```

```
SIG meningkatkan efisiensi pemetaan risiko
bencana, pengelolaan sumber daya alam, dan
perencanaan ruang berkelanjutan.
```

**Angglena dkk** [10] Pemetaan Zona
Rawan Gempa
Berdasarkan Jejak
Historis Gempa
dan Kerusakan
Infrastruktur

```
Deskriptif
Spasial
```

```
Zona rawan
gempa dan
kerusakan
infrastruktur
```

```
Sistem Informasi Geografis
(SIG)
```

```
Identifikasi pola persebaran gempa dan
wilayah dengan tingkat kerusakan tinggi
```

**Fikriyah dkk** [11] GIS Sebagai Alat
untuk
Perencanaan
Evakuasi dan

```
Tinjauan
Literatur
```

```
Perencanaan
evakuasi dan
manajemen krisis
bencana
```

```
Sistem Informasi Geografis
(SIG)
```

```
GIS alat berharga untuk penilaian risiko,
analisis spasial, integrasi data, visualisasi,
pengambilan keputusan, dan respons cepat.
```

```
Manajemen Krisis
Bencana
```

**Muhandhis dkk** [12] Sistem Informasi
Geografis
Bencana Gempa
Bumi Dengan
Pendekatan Pga
Untuk Mitigasi
Bencana

```
Pengembangan
Sistem
```

```
Mitigasi bencana
gempa bumi
```

```
PHP, MySQL, Web-GIS Sistem informasi geografis berbasis web
untuk mitigasi bencana gempa bumi.
```

**Adzim dkk** [13] Manajemen
Bencana Gempa
Bumi Pada Tahap
Pra Bencana Di
Kota Mataram
Provinsi Nusa
Tenggara Barat

```
Deskriptif
Kualitatif
(Wawancara,
Observasi,
Dokumentasi)
```

```
Manajemen
bencana pada
tahap pra bencana
di BPBD Kota
Mataram
```

- BPBD Kota Mataram telah mengoptimalkan
  faktor manajemen bencana pada tahap pra
  bencana.

Penelitian terdahulu memiliki kesamaan dengan penelitian ini dalam penggunaan Sistem Informasi
Geografis (SIG) dan pendekatan deskriptif untuk mitigasi bencana gempa bumi. Akan tetapi yang
menjadi perbedaan pada penelitian ini adalah fokus pada pengembangan sistem pemetaan interaktif
berbasis web untuk manajemen krisis gempa bumi di Kabupaten Bantul, yang dilengkapi fitur
visualisasi jalur evakuasi, titik evakuasi, dan fasilitas umum. Selain itu, penelitian ini juga menekankan
pada implementasi teknis dan pengujian sistem secara menyeluruh untuk memastikan fungsionalitas
dan kemudahan penggunaan oleh masyarakat dan pemangku kepentingan.

**2.2. Landasan Teori**

**2.2.1. Sistem Informasi Geografis (SIG)**

Sistem Informasi Geografis (SIG) adalah sistem komputer yang dirancang untuk mengumpulkan,
menyimpan, mengelola, menganalisis, dan menampilkan semua jenis data geografis atau spasial. Data
spasial adalah data yang memiliki referensi lokasi di permukaan bumi. SIG memungkinkan pengguna
untuk memahami pola, hubungan, dan tren geografis, yang sangat penting dalam berbagai bidang,
termasuk manajemen bencana[7], [9], [11].

```
Sistem Informasi Geografis (SIG) memiliki kemampuan untuk mengintegrasikan, menganalisis, dan
```

memvisualisasikan data spasial, sehingga sangat membantu dalam mengidentifikasi area rawan

bencana, memantau kondisi lingkungan, serta merencanakan jalur evakuasi secara efektif.

Kemampuan ini menjadikan SIG sebagai alat yang sangat strategis dalam mendukung pengambilan

keputusan yang cepat dan tepat, sekaligus meningkatkan efektivitas respons darurat[7]. Secara umum,

komponen utama SIG meliputi:

1. Perangkat Keras (Hardware): Komputer, printer, scanner, GPS, dan perangkat lain yang
   mendukung pengolahan data geografis.
2. Perangkat Lunak (Software): Aplikasi SIG seperti ArcGIS, QGIS, atau perangkat lunak kustom
   yang digunakan untuk mengelola dan menganalisis data spasial.
3. Data Geografis (Geographic Data): Data spasial (lokasi) dan data atribut (informasi deskriptif
   terkait lokasi) yang menjadi inti dari SIG.

4. Manusia (People): Pengguna SIG yang merancang, mengelola, dan menganalisis data untuk
   tujuan tertentu.
5. Metode (Methods): Prosedur dan teknik yang digunakan untuk mengimplementasikan SIG,
   termasuk desain sistem, analisis data, dan interpretasi hasil.

```
Dalam konteks manajemen bencana, SIG berfungsi sebagai alat vital untuk:
```

1. Pemetaan Risiko Bencana: Mengidentifikasi dan memvisualisasikan area yang rentan terhadap
   bencana, seperti zona rawan gempa, jalur evakuasi, dan lokasi pengungsian[10].
2. Analisis Spasial: Melakukan analisis kompleks terhadap data geografis untuk memahami
   hubungan antar fenomena, misalnya korelasi antara kepadatan penduduk dan tingkat
   kerusakan akibat gempa[7].
3. Pengambilan Keputusan: Menyediakan informasi yang akurat dan cepat untuk mendukung
   keputusan strategis selama fase pra-bencana, saat bencana, dan pasca-bencana[11].
4. Diseminasi Informasi: Menyajikan informasi bencana kepada publik dan pihak terkait dalam
   format yang mudah dipahami, seringkali melalui platform berbasis web (WebGIS)[12].

**2.2.2. Manajemen Krisis Bencana**

```
Manajemen krisis bencana adalah serangkaian kegiatan yang terencana dan terkoordinasi untuk
```

mengurangi dampak bencana, meningkatkan kesiapsiagaan, merespons secara efektif, dan

memulihkan kondisi pasca-bencana. Tujuannya adalah untuk melindungi nyawa, mengurangi kerugian

harta benda, dan meminimalkan gangguan terhadap fungsi Masyarakat[13]. Siklus manajemen

bencana umumnya dibagi menjadi beberapa fase utama:

1. Pra-Bencana (Pre-Disaster): Fase ini berfokus pada pencegahan dan mitigasi. Kegiatan
   meliputi:
   a. Pencegahan: Upaya untuk mencegah terjadinya bencana atau mengurangi
   dampaknya.

```
b. Mitigasi: Tindakan untuk mengurangi risiko bencana, baik melalui upaya struktural
(misalnya, pembangunan tanggul, penguatan bangunan) maupun non-struktural
(misalnya, penyusunan kebijakan, pelatihan, simulasi bencana).
c. Kesiapsiagaan: Persiapan untuk menghadapi bencana yang mungkin terjadi,
termasuk penyusunan rencana kontingensi, pembentukan tim reaksi cepat, dan
penyediaan logistik darurat.
```

2. Saat Bencana (During-Disaster): Fase ini berfokus pada respons darurat. Kegiatan meliputi:
   a. Peringatan Dini: Pemberian informasi segera kepada masyarakat tentang
   ancaman bencana yang akan terjadi atau sedang terjadi.
   b. Evakuasi: Pemindahan penduduk dari area berbahaya ke tempat yang lebih aman.
   c. Pencarian dan Penyelamatan: Upaya untuk menemukan dan menyelamatkan
   korban bencana.
   d. Bantuan Darurat: Penyediaan kebutuhan dasar seperti makanan, air bersih,
   tempat tinggal sementara, dan layanan medis.
3. Pasca-Bencana (Post-Disaster): Fase ini berfokus pada pemulihan. Kegiatan meliputi:
   a. Rehabilitasi: Pemulihan kondisi sosial dan ekonomi masyarakat serta perbaikan
   fasilitas dan infrastruktur yang rusak agar berfungsi kembali.
   b. Rekonstruksi: Pembangunan kembali secara permanen semua prasarana, sarana,
   dan fasilitas umum serta kehidupan masyarakat dengan memperhatikan standar
   yang lebih baik dan aman dari bencana.

**2.2.3. Representasi Spasial dalam Manajemen Bencana**

```
Representasi spasial merupakan salah satu fungsi utama dari Sistem Informasi Geografis (SIG),
```

yang memungkinkan penyajian informasi geografi dalam bentuk visual seperti peta tematik, simbol,

dan layer interaktif. Dalam konteks manajemen bencana, representasi spasial sangat krusial untuk

memahami distribusi spasial risiko bencana, mengidentifikasi area yang paling rentan, dan

merencanakan intervensi yang efektif[14].

```
Angglena dan Pandey (2025) memanfaatkan SIG untuk menyajikan peta zona rawan gempa
```

berdasarkan data historis dan kerusakan infrastruktur. Meskipun penelitian mereka melibatkan

analisis spasial, visualisasi hasil akhirnya tetap menjadi contoh representasi spasial yang berguna

dalam konteks kesiapsiagaan bencana[10]. Dengan menampilkan data historis dalam bentuk peta,

masyarakat dan pengambil kebijakan dapat lebih mudah memahami potensi risiko di suatu wilayah,

meskipun tanpa perhitungan kuantitatif spasial[15].

```
Selain itu, representasi spasial juga bermanfaat dalam menentukan lokasi fasilitas darurat seperti
```

posko evakuasi dan distribusi bantuan. SIG membantu menyajikan peta yang mempertimbangkan

faktor-faktor geografis seperti topografi, jaringan jalan, dan kepadatan penduduk, meskipun

penentuan lokasi dalam konteks ini masih bersifat deskriptif dan visual, bukan berbasis analisis spasial

algoritmik [16].

**2.2.4. Peran Komunikasi dalam Manajemen Krisis Bencana**

```
Komunikasi yang efektif merupakan elemen krusial dalam manajemen krisis bencana. Selama
```

bencana, informasi harus disebarkan dengan cepat dan akurat kepada masyarakat, pihak berwenang,

dan tim respons. Komunikasi yang buruk dapat menyebabkan kebingungan, kepanikan, dan bahkan

peningkatan korban jiwa[17].

```
Dalam konteks gempa bumi, sistem komunikasi yang andal sangat penting untuk menyampaikan
```

peringatan dini, instruksi evakuasi, dan informasi tentang lokasi aman. Teknologi modern, termasuk

media sosial dan aplikasi pesan instan, telah menjadi alat yang semakin penting dalam penyebaran

informasi bencana. Namun, penting untuk memastikan bahwa informasi yang disebarkan diverifikasi

dan berasal dari sumber yang kredibel untuk menghindari disinformasi [18].

```
Selain itu, komunikasi dua arah, di mana masyarakat dapat melaporkan situasi dan kebutuhan
```

mereka, juga sangat berharga. Hal ini memungkinkan pihak berwenang untuk mendapatkan gambaran

yang lebih akurat tentang situasi di lapangan dan menyesuaikan respons mereka sesuai kebutuhan.

Integrasi sistem komunikasi dengan SIG dapat menciptakan platform yang kuat untuk manajemen

krisis yang komprehensif [16].

# BAB III. METODOLOGI PENELITIAN

**3.1. Kerangka Kerja Penelitian**

```
Penelitian ini akan dilaksanakan melalui beberapa tahapan utama yang saling berkaitan. Model
```

pengembangan sistem yang diadopsi adalah model _waterfall_. Model ini dipilih karena pendekatannya

yang terstruktur dan berurutan, di mana setiap fase harus diselesaikan sebelum melanjutkan ke fase

berikutnya, sehingga cocok untuk proyek dengan kebutuhan yang telah terdefinisi dengan jelas di

awal. Tahapan dalam kerangka kerja ini meliputi:

1. Analisis Kebutuhan: Menganalisis kebutuhan fungsional sistem dan kebutuhan pengguna
   untuk menentukan spesifikasi sistem yang akan dikembangkan.
2. Perancangan Sistem: Membuat rancangan teknis yang mencakup arsitektur sistem, basis data
   spasial, dan antarmuka pengguna.
3. Implementasi: Mengembangkan sistem berbasis web menggunakan perangkat lunak dan
   perangkat keras yang telah ditentukan.
4. Pengujian: Melakukan pengujian fungsionalitas, akurasi data, dan usabilitas untuk memastikan
   sistem berjalan sesuai harapan.
5. Evaluasi dan Revisi: Mengevaluasi hasil pengujian dan melakukan perbaikan jika ditemukan
   kekurangan sebelum sistem dianggap siap digunakan.

**3.2. Metode Pengumpulan Data**

Pengumpulan data merupakan tahap awal yang krusial untuk memperoleh informasi yang akurat dan

relevan. Metode yang digunakan terdiri dari pengumpulan data primer dan sekunder.

**3.2.1. Data Primer**

Data primer merupakan data yang diperoleh secara langsung dari sumber pertama dan

digunakan sebagai pendukung dalam pengembangan sistem. Dalam penelitian ini, pengumpulan data

primer dilakukan secara terbatas melalui:

```
a) Wawancara: Wawancara semi-terstruktur dilakukan atau direncanakan dengan pihak
terkait, seperti Badan Penanggulangan Bencana Daerah (BPBD) Kabupaten Bantul, untuk
memperoleh informasi mengenai kebutuhan sistem serta alur manajemen krisis yang
berjalan. Informasi yang diperoleh digunakan sebagai acuan dalam merancang fitur dan
fungsi sistem agar sesuai dengan kebutuhan pengguna.
```

**3.2.2. Data Sekunder**

```
Data sekunder diperoleh dari instansi terkait, dokumentasi resmi, serta studi literatur yang
relevan.
a. BPBD Kabupaten Bantul
Data yang diperoleh dari BPBD Kabupaten Bantul meliputi peta zona rawan gempa,
data historis kejadian bencana, lokasi titik evakuasi dan shelter, serta dokumen rencana
kontingensi. Data ini digunakan sebagai dasar dalam penyusunan informasi spasial terkait
mitigasi bencana dan penentuan area prioritas evakuasi.
b. BMKG
Data yang diperoleh dari BMKG meliputi informasi sesar aktif, data percepatan
getaran tanah (Peak Ground Acceleration/PGA) , serta data gempa bumi terkini yang
diakses melalui API publik BMKG. Data API tersebut mencakup informasi gempa terbaru,
daftar gempa dengan magnitudo 5 ke atas, serta data gempa yang dirasakan oleh
masyarakat. Data ini dimanfaatkan sebagai sumber informasi semi real-time untuk
mendukung visualisasi kejadian gempa terbaru dalam sistem.
c. Data Peta Dasar dan Jaringan Jalan
Data jaringan jalan dan peta dasar diperoleh melalui sumber data spasial terbuka, seperti
OpenStreetMap dan peta administrasi wilayah. Data ini digunakan sebagai layer dasar
dalam proses overlay untuk menentukan jalur evakuasi yang aman dan optimal.
e) BPS Kabupaten Bantul
```

```
Data yang diperoleh dari BPS Kabupaten Bantul meliputi data kependudukan, persebaran
penduduk, serta data administratif wilayah. Data ini digunakan untuk mendukung analisis
wilayah terdampak dan kebutuhan evakuasi berdasarkan kepadatan penduduk.
f) Studi Literatur
Studi literatur dilakukan melalui pengumpulan referensi dari jurnal ilmiah, penelitian
terdahulu, buku, dan dokumen kebijakan yang relevan. Studi ini bertujuan untuk
memperkuat landasan teori yang digunakan dalam penelitian, khususnya terkait sistem
informasi geografis, mitigasi bencana, metode weighted overlay , algoritma Dijkstra , serta
pengembangan WebGIS.
```

**3.3. Metode Analisis Data Kuantitatif**

```
Penelitian ini menggunakan pendekatan kuantitatif deskriptif untuk menganalisis data
spasial dalam menentukan jalur evakuasi aman pada wilayah rawan gempa bumi di Kabupaten
Bantul. Analisis dilakukan dengan mempertimbangkan beberapa parameter yang
memengaruhi keamanan jalur evakuasi, yaitu:
```

1. tingkat kerawanan gempa,
2. kondisi jaringan jalan,
3. jarak menuju titik evakuasi.
   Setiap parameter diberikan skor berdasarkan tingkat pengaruhnya terhadap keamanan
   jalur.

```
3.3.1. Weighted Overlay
```

```
Metode weighted overlay merupakan salah satu metode analisis spasial yang digunakan
untuk menggabungkan beberapa parameter dengan tingkat kepentingan tertentu guna
menghasilkan suatu nilai akhir. Dalam penelitian ini, metode weighted overlay digunakan
untuk menentukan tingkat keamanan pada setiap ruas jalan yang akan digunakan sebagai jalur
evakuasi.
Parameter yang digunakan dalam proses pembobotan meliputi tingkat kerawanan gempa,
kondisi jaringan jalan, dan jarak menuju titik evakuasi. Setiap parameter diberikan bobot
berdasarkan tingkat pengaruhnya terhadap keamanan jalur evakuasi.
Adapun bobot yang digunakan dalam penelitian ini adalah sebagai berikut:
```

1. Tingkat kerawanan gempa sebesar 50%
2. Kondisi jaringan jalan sebesar 30%
3. Jarak menuju titik evakuasi sebesar 20%
   Penentuan bobot tersebut didasarkan pada asumsi bahwa tingkat kerawanan gempa
   memiliki pengaruh paling besar terhadap keamanan jalur evakuasi dibandingkan parameter
   lainnya
   Perhitungan nilai akhir untuk setiap ruas jalan dilakukan dengan menggunakan persamaan
   berikut.
   𝑆𝑘𝑜𝑟= (𝑊 1 ×𝐻𝑎𝑧𝑎𝑟𝑑)+(𝑊 2 ×𝐶𝑜𝑛𝑑𝑖𝑡𝑖𝑜𝑛)+(𝑊 3 × 𝐷𝑖𝑠𝑡𝑎𝑛𝑐𝑒)
   dengan keterangan:
4. 𝑊 1 = 0 , 5 : Bobot kerawanan gempa,
5. 𝑊 2 = 0 , 3 : Bobot kondisi jalan,
6. 𝑊 3 = 0 , 2 : Bobot Jarak.
   Nilai skor yang dihasilkan digunakan untuk merepresentasikan tingkat keamanan suatu ruas
   jalan. Semakin besar nilai skor yang dihasilkan, maka semakin tinggi pula tingkat risiko pada
   ruas jalan tersebut.
   Terdapat tiga parameter yang digunakan dalam perhitungan metode _weighted overlay_ ,
   yaitu sebagai berikut.
7. Kerawanan Gempa ( _Hazard_ ) — Parameter ini menunjukkan tingkat risiko gempa
   pada suatu wilayah yang diperoleh dari hasil analisis frekuensi gempa serta data
   zona risiko. Nilai yang lebih tinggi menunjukkan tingkat kerawanan yang lebih
   besar.
8. Kondisi Jaringan Jalan ( _Road Condition_ ) — Parameter ini menggambarkan kondisi
   fisik jalan, seperti baik (good), sedang (moderate), atau rusak (damaged). Kondisi
   jalan memengaruhi kelayakan jalur untuk digunakan sebagai rute evakuasi.
9. Jarak Menuju Titik Evakuasi ( _Distance_ ) — Parameter ini dihitung berdasarkan jarak
   antara lokasi pengguna, ruas jalan, dan titik evakuasi terdekat menggunakan
   metode haversine. Semakin jauh jarak menuju titik evakuasi, maka tingkat risiko
   akan semakin tinggi.
   Proses penggabungan beberapa parameter dalam metode weighted overlay dapat dilihat pada
   Gambar 3.

## Gambar 3. 1 ilustrasi Weighted Overlay dalam Analisis Resiko Jalur Evakuasi Gambar 1 Flowchart Error! Bookmark not defined.

```
3.3.2. Algoritma Dijkstra
```

```
Algoritma Dijkstra merupakan algoritma yang digunakan untuk mencari jalur terpendek
dari suatu titik ke titik tujuan pada suatu graf berbobot. Dalam penelitian ini, algoritma Dijkstra
digunakan untuk menentukan jalur evakuasi utama dan jalur alternatif menuju titik evakuasi
terdekat.
Graf dalam konteks penelitian ini direpresentasikan sebagai jaringan jalan, di mana simpul
(node) merepresentasikan titik pertemuan jalan dan sisi (edge) merepresentasikan ruas jalan
yang menghubungkan antarsimpul. Setiap ruas jalan memiliki bobot yang diperoleh dari hasil
perhitungan metode weighted overlay, yang mencerminkan tingkat risiko pada ruas jalan
tersebut.
Algoritma Dijkstra bekerja dengan cara menelusuri seluruh kemungkinan jalur dari titik
awal menuju titik tujuan dan menghitung total bobot dari setiap jalur. Proses ini dilakukan
dengan memilih jalur yang memiliki total bobot terkecil hingga mencapai titik tujuan. Dengan
demikian, jalur yang dihasilkan bukan hanya jalur terpendek secara jarak, tetapi juga
merupakan jalur dengan tingkat risiko paling rendah berdasarkan hasil analisis sebelumnya.
```

**3.3.3. Analisis Frekuensi Kejadian Gempa**

```
Selain analisis jalur evakuasi, penelitian ini juga melakukan analisis frekuensi kejadian
gempa berdasarkan data historis. Analisis ini bertujuan untuk mengidentifikasi wilayah yang
memiliki tingkat kejadian gempa tinggi, sedang, dan rendah.
Metode yang digunakan adalah agregasi spasial berbasis grid, di mana wilayah penelitian
dibagi menjadi beberapa sel grid dengan ukuran tertentu. Setiap kejadian gempa yang
diperoleh dari data BMKG akan dipetakan ke dalam grid yang sesuai dan dihitung jumlah
kejadiannya dalam periode waktu tertentu.
Hasil perhitungan frekuensi kemudian diklasifikasikan ke dalam beberapa kategori, yaitu:
```

- rendah,
- sedang,
- tinggi.
  Klasifikasi ini digunakan untuk menghasilkan peta tematik yang menggambarkan distribusi
  frekuensi gempa, sehingga dapat memberikan gambaran wilayah yang lebih sering terdampak
  gempa dan mendukung analisis mitigasi bencana.

**_3.4. Software_** **Dan** **_Hardware_**

```
Dalam melakukan penelitian ini, dibutuhkan beberapa perangkat keras ( hardware ) dan
perangkat lunak ( software ) sebagai alat dan bahan pendukung dalam proses perancangan,
pengembangan, dan pengujian sistem. Perangkat keras dan perangkat lunak yang digunakan
dapat dilihat pada Tabel 3.3.1.
```

```
Tabel 3. 1 Software dan Hardware
Hardware
Nama Keterangan
Laptop Pengembang Model : Setara dengan Ryzen 5 5500U
RAM : 16 GB
Penyimpanan : 512 GB SSD
Fungsi : Digunakan untuk seluruh proses
pengembangan, termasuk penulisan
kode, kompilasi, dan pengujian sistem.
```

```
Perangkat GPS Jenis : Smartphone atau GPS Genggam
Fungsi : Digunakan untuk akuisisi data
koordinat primer di lapangan guna
memastikan akurasi lokasi yang belum
terpetakan.
Perangkat Jaringan Jenis : Router dan Koneksi Internet
Fungsi : Menyediakan konektivitas
untuk mengakses sumber daya daring,
API pemetaan, dan melakukan
deployment aplikasi web.
```

```
Software
Nama Keterangan
Sistem Operasi Windows 11
SubSystem Linux WSL Ubuntu
Lingkungan Pengembangan Visual Studio Code
Bahasa & Framework TypeScript, Next.JS, NestJS
Library Pemetaan Leaflet.js
Basis Data PostgreSQL + PostGIS
Desain Antarmuka Figma
Web Server Nginx
Cache Redis (melalui WSL Ubuntu)
Realtime Communication WebSocket
```

**3.5. Tahapan Penelitian**

```
3.5.1. Perancangan Arsitektur Sistem
```

```
Sistem ini mengadopsi arsitektur Client-Server yang terpisah (decoupled) untuk memastikan
skalabilitas dan efisiensi performa. Alur kerja arsitektur sistem dirancang sebagai berikut:
a. Frontend (Client-Side) : Dibangun menggunakan framework Next.js. Sisi klien
bertanggung jawab untuk menyajikan antarmuka pengguna yang dinamis, termasuk
visualisasi peta interaktif, dasbor pemantauan gempa, serta informasi spasial seperti
jalur evakuasi, titik shelter, dan fasilitas umum.
b. Backend (Server-Side) : Menggunakan framework NestJS yang berfungsi sebagai pusat
logika bisnis. Backend menangani pengolahan data spasial, integrasi dengan API
```

```
BMKG, manajemen rute evakuasi, serta menyediakan layanan API untuk dikonsumsi
oleh frontend.
c. Basis Data: Menggunakan PostgreSQL dengan ekstensi PostGIS. Kombinasi ini
memungkinkan sistem untuk menyimpan dan melakukan kueri data spasial yang
kompleks (koordinat, poligon zona rawan, dan jaringan jalan).
d. Caching : Redis diimplementasikan sebagai lapisan cache untuk menyimpan data
gempa terkini. Hal ini bertujuan untuk mempercepat waktu respon sistem dan
mengurangi latensi akibat permintaan berulang ke API eksternal.
e. Komunikasi Real-time: Protokol WebSocket digunakan untuk mendistribusikan
notifikasi dan pembaruan data gempa terbaru secara near real-time kepada pengguna
tanpa perlu memuat ulang halaman.
```

**3.5.2. Perancangan Basis Data Spasial**

```
Perancangan basis data difokuskan pada efisiensi penyimpanan atribut non-spasial dan
koordinat geografis. Objek dalam basis data dikelompokkan berdasarkan entitas berikut:
a. Data Teknis: Informasi detail kejadian gempa bumi dan pemetaan zona rawan
bencana.
b. Data Sarana & Prasarana: Lokasi shelter (titik pengungsian), fasilitas umum, dan
jaringan jalan.
c. Data Navigasi: Representasi geometris untuk jalur evakuasi.
Setiap entitas direpresentasikan menggunakan tipe data geometri PostGIS sebagai berikut:
a. Point: Digunakan untuk lokasi pusat gempa (episenter), titik fasilitas umum, dan lokasi
shelter.
b. LineString: Digunakan untuk merepresentasikan jaringan jalan dan rute jalur evakuasi.
c. Polygon: Digunakan untuk mendefinisikan area atau cakupan wilayah pada zona rawan
bencana.
```

**3.5.3. Perancangan Antarmuka Pengguna (** **_User Interface/User Experience_** **- UI/UX)**

```
Perancangan antarmuka pengguna bertujuan untuk menciptakan tampilan yang
intuitif, informatif, dan mudah digunakan oleh berbagai jenis pengguna (BPBD, perangkat
desa, dan masyarakat). Aspek yang diperhatikan meliputi:
```

1. Tata Letak Peta: Desain visual peta utama yang akan menampilkan seluruh
   informasi spasial.
2. Elemen Navigasi: Penempatan _tool_ seperti _zoom_ , _pan_ , dan pencarian.
3. Simbologi Peta: Penentuan simbol dan warna yang jelas untuk merepresentasikan
   daerah rawan, titik evakuasi, jalur evakuasi, dan fasilitas umum.
4. Panel Informasi: Desain panel yang akan menampilkan detail informasi ketika
   pengguna berinteraksi dengan objek di peta.
5. Responsivitas: Memastikan desain antarmuka dapat beradaptasi dengan baik
   pada berbagai ukuran layar perangkat (desktop dan _mobile_ ).

**3.5.4. Perancangan Alur Sistem (** **_Flowchart_** **)**

```
Sebagai bagian dari perancangan, akan dibuat flowchart yang menggambarkan alur
kerja sistem secara keseluruhan. Flowchart ini akan menunjukkan bagaimana data mengalir
melalui sistem, mulai dari interaksi pengguna hingga proses pengambilan dan penyajian
informasi. Diagram alir ini akan membantu dalam memvisualisasikan logika dan urutan
operasional sistem secara logis.
```

## Gambar 3. 2 Alur Tahapan Penelitian

Flowchart pada Gambar 3. 2 menggambarkan alur tahapan penelitian ini, dimulai dari
identifikasi masalah hingga tahap akhir implementasi sistem. Penjelasan dari setiap langkah pada
flowchart adalah sebagai berikut:

1. Mulai Merupakan titik awal proses penelitian. Pada tahap ini, ditetapkan ruang lingkup
   dan tujuan penelitian.
2. Identifikasi Masalah Peneliti mengidentifikasi kebutuhan akan sistem pemetaan interaktif
   berbasis SIG untuk mitigasi bencana gempa bumi di Kabupaten Bantul.
3. Pengumpulan Data Data dikumpulkan melalui dua metode utama:
   a) Observasi (Lapangan): wawancara dengan pihak BPBD serta perangkat desa.
   b) Studi Literatur: Pengumpulan data dari dokumen BPBD, BMKG, BPS, serta kajian
   pustaka dari jurnal ilmiah terkait.
4. Data yang telah dikumpulkan dari berbagai sumber (primer dan sekunder) akan diolah,
   disesuaikan format serta sistem koordinatnya, kemudian diintegrasikan ke dalam basis
   data spasial berbasis _PostGIS_ dengan dukungan fitur geospasial. Proses ini memungkinkan

```
penggabungan data vektor (titik, garis, dan poligon) beserta atribut non-spasial dari
berbagai instansi (BPBD, BMKG, dan BPS) ke dalam satu sistem visualisasi spasial yang
terpadu dan mudah diakses.
```

5. Sistem dikembangkan berdasarkan hasil analisis dan perancangan sebelumnya, mencakup
   frontend, backend, basis data, serta fitur-fitur utama seperti visualisasi peta, titik evakuasi,
   dan jalur evakuasi. Sistem ini bersifat interaktif, memungkinkan pengguna mengeklik titik
   tertentu untuk menampilkan informasi detail, menyaring informasi berdasarkan filter
   waktu atau wilayah, serta mencari lokasi secara langsung melalui fitur pencarian. Sistem
   pemetaan interaktif yang dikembangkan tidak hanya menampilkan informasi spasial
   secara pasif, tetapi juga memungkinkan pengguna untuk berinteraksi secara aktif dengan
   elemen-elemen pada peta. Pengguna dapat melakukan beberapa aksi seperti:
   a) Mengeklik titik kumpul atau lokasi gempa untuk melihat detail informasi
   (misalnya jalur evakuasi, kendala lapangan, atau parameter kejadian gempa).
   b) Menggunakan fitur filter untuk menyaring data berdasarkan tanggal kejadian,
   tingkat kerusakan, dan wilayah administratif (kecamatan).
   c) Melakukan pencarian lokasi tertentu melalui kolom pencarian.
   d) Interaktivitas ini dirancang untuk mendukung pemahaman spasial secara
   interaktif dan terkini, serta memfasilitasi pengambilan keputusan yang lebih
   cepat, terutama bagi BPBD, perangkat desa, maupun masyarakat umum yang
   menjadi pengguna akhir sistem.
6. Pengujian Dilakukan pengujian sistem secara menyeluruh meliputi:

```
a) Pengujian fungsionalitas
b) Pengujian akurasi data
c) Pengujian usabilitas
d) Pengujian performa
```

7. Hasil

```
a) Jika gagal pada tahap pengujian, maka dilakukan perbaikan pada tahapan sebelumnya
(pengolahan data dan/atau pengembangan sistem).
b) Jika berhasil, maka sistem dianggap valid dan layak untuk digunakan.
```

8. Selesai Penelitian selesai dan sistem pemetaan interaktif berbasis SIG telah berhasil
   dikembangkan serta divalidasi.

**3.6. Implementasi**

**3.6.1. Pengembangan sistem** **_Frontend_** **dan** **_Backend_**

Implementasi sistem dilakukan menggunakan arsitektur _client-server_ terpisah, di mana _frontend_
dan _backend_ dikembangkan secara independen untuk meningkatkan fleksibilitas, skalabilitas, dan
kemudahan pengelolaan sistem.
_Frontend_ dikembangkan menggunakan Next.js dengan memanfaatkan React.js untuk
membangun antarmuka pengguna yang interaktif dan responsif. Pada bagian _frontend_ , dikembangkan
komponen-komponen utama seperti peta interaktif menggunakan library Leaflet.js, sidebar navigasi,
pop-up informasi, fitur pencarian lokasi, serta layer peta yang menampilkan zona rawan gempa, titik
evakuasi, jalur evakuasi, dan fasilitas umum. Next.js juga digunakan untuk mendukung optimasi
performa melalui teknik rendering seperti server-side rendering (SSR) dan static generation.
_Backend_ dikembangkan menggunakan NestJS yang berfungsi sebagai pengelola logika bisnis,
pengolahan data, serta penyedia layanan _API_. Backend menyediakan endpoint untuk melakukan
operasi pengambilan, penyimpanan, pembaruan, dan penghapusan data spasial seperti data gempa,
zona rawan, jalur evakuasi, dan fasilitas umum. Selain itu, backend juga menangani proses integrasi
dengan API eksternal BMKG serta pengelolaan jalur evakuasi menggunakan metode _weighted overlay_
dan algoritma _Dijkstra_.
Basis data yang digunakan adalah PostgreSQL dengan ekstensi PostGIS untuk mendukung
penyimpanan data spasial seperti titik (point), garis (linestring), dan poligon (polygon). Sistem juga
memanfaatkan Redis sebagai media _cache_ untuk menyimpan data gempa terbaru guna mengurangi
frekuensi permintaan ke API BMKG.

**3.6.2. Integrasi Data Spasial**

Data spasial yang telah dikumpulkan dari berbagai sumber, baik data primer maupun
sekunder, diintegrasikan ke dalam basis data PostgreSQL dengan ekstensi PostGIS. Proses integrasi
meliputi konversi format data, penyesuaian sistem koordinat, serta normalisasi data untuk
memastikan konsistensi dan akurasi informasi spasial.

Selain data statis, sistem juga mengintegrasikan data gempa bumi dari API publik BMKG.
Backend melakukan proses sinkronisasi data gempa secara berkala dalam interval waktu tertentu. Data
yang diperoleh kemudian dibandingkan dengan data yang telah tersimpan untuk menghindari
duplikasi.
Apabila terdapat data gempa terbaru, sistem akan:

1. Menyimpan data ke dalam basis data PostgreSQL
2. Memperbarui data _cache_ pada Redis
3. Mengirimkan pembaruan data ke frontend melalui _WebSocket_
   Pendekatan ini memungkinkan sistem menampilkan informasi gempa secara semi real-time dengan
   tetap menjaga efisiensi sistem.

**3.6.3. Pengembangan Fitur Spesifik**

Implementasi fitur-fitur khusus sistem akan dilakukan, seperti:

1. Visualisasi Peta Tematik: Menampilkan zona rawan gempa bumi dengan gradasi warna yang
   berbeda berdasarkan tingkat kerawanan menggunakan data dari basis data.
2. Penanda Titik dan Jalur Evakuasi: Menambahkan penanda ( _marker_ ) untuk titik evakuasi dan
   garis ( _polyline_ ) untuk jalur evakuasi pada peta, yang datanya diambil dari API _backend_.
3. Informasi Detail Interaktif: Membuat _pop-up_ atau panel yang menampilkan informasi detail
   ketika pengguna mengklik titik atau area tertentu pada peta, dengan data yang diambil
   secara dinamis melalui API.
4. Fungsi Pencarian: Mengimplementasikan _search bar_ yang memungkinkan pengguna mencari
   lokasi, fasilitas, atau daerah tertentu dengan memanfaatkan API _backend_ untuk _query_ basis
   data.

**3.7. Pengujian**

Tahap pengujian merupakan proses krusial untuk memastikan bahwa sistem yang dikembangkan
berfungsi dengan benar, akurat, dan memenuhi kebutuhan pengguna. Pengujian akan dilakukan
secara sistematis untuk mengidentifikasi _bug_ atau kesalahan dan memvalidasi kinerja sistem.

**3.7.1. Pengujian Fungsionalitas (** **_Black-box Testing_** **)**

Pengujian ini berfokus pada validasi semua fitur dan fungsionalitas sistem dari perspektif
pengguna tanpa melihat kode internal. Setiap fitur akan diuji untuk memastikan output yang
diharapkan sesuai dengan input yang diberikan. Skenario pengujian akan meliputi:

```
a) Memuat peta dan lapisan-lapisan informasi.
b) Pencarian lokasi dan fasilitas.
c) Menampilkan informasi detail dari objek peta.
d) Navigasi peta ( zoom , pan ).
e) Filter dan seleksi data.
```

**3.7.2. Pengujian Akurasi Data Spasial**

Pengujian ini bertujuan untuk memverifikasi ketepatan dan keandalan informasi spasial yang
ditampilkan pada peta. Ini akan melibatkan perbandingan data yang ditampilkan oleh sistem dengan
data referensi resmi dari sumber terpercaya (misalnya, data dari BMKG atau BPBD). Aspek yang diuji
meliputi:

```
a) Kesesuaian Koordinat: Memeriksa apakah koordinat titik evakuasi dan fasilitas umum pada peta
sesuai dengan koordinat dari data BPBD/BPS (tidak melenceng).
b) Ketepatan Representasi Jalur Evakuasi: Memastikan jalur evakuasi yang digambar di peta sesuai
dengan peta rute, baik dari segi trase maupun panjang.
c) Akurasi Batas Zona Rawan: Memeriksa poligon zona rawan gempa yang ditampilkan, apakah
sudah sesuai dengan peta zonasi rawan gempa dari BPBD (misalnya dengan melakukan overlay
secara visual).
```

**3.7.3. Pengujian Usabilitas (** **_User Acceptance Testing - UAT_** **)**

Pengujian usabilitas dilakukan untuk mengevaluasi kemudahan penggunaan, efisiensi, dan
kepuasan pengguna terhadap sistem. _UAT_ akan melibatkan perwakilan dari target pengguna (BPBD,
perangkat desa, dan masyarakat di zona rawan bencana). Metode pengujian dapat berupa:

```
a) Kuesioner: Mengumpulkan umpan balik terstruktur mengenai antarmuka, fungsionalitas, dan
kegunaan sistem.
```

```
b) Skenario Penggunaan: Memberikan tugas-tugas spesifik kepada pengguna untuk diselesaikan
menggunakan sistem, kemudian mengamati dan mencatat kesulitan atau kemudahan yang
ditemui.
c) Wawancara: Mengadakan diskusi untuk mendapatkan wawasan lebih dalam mengenai
pengalaman pengguna.
```

**3.7.4. Pengujian Performa**

Pengujian performa akan dilakukan untuk menilai responsivitas dan kecepatan sistem, terutama
saat memuat data spasial yang besar atau saat banyak pengguna mengakses sistem secara bersamaan.
Ini dapat mencakup pengujian waktu _loading_ peta dan kecepatan eksekusi _query_ basis data.

**3.7.5. Metode Pengujian Keseluruhan**

Secara keseluruhan, penelitian ini menggunakan pendekatan pengujian gabungan, yang
mencakup pengujian fungsional untuk memastikan sistem berjalan sesuai spesifikasi, pengujian
akurasi data untuk validasi informasi geografis, pengujian usabilitas untuk memastikan sistem mudah
digunakan dan diterima pengguna, serta pengujian performa untuk menjamin sistem dapat bekerja
dengan lancar dalam skenario penggunaan sebenarnya. Hasil dari setiap jenis pengujian
didokumentasikan dan dianalisis untuk mengidentifikasi area yang masih memerlukan perbaikan.
Semua umpan balik dan temuan dari tahap pengujian digunakan sebagai dasar untuk iterasi perbaikan
akhir sebelum sistem dinyatakan siap digunakan secara luas.

# BAB IV. HASIL DAN PEMBAHASAN

**4.1. Hasil Analisis Kebutuhan Sistem**

```
Analisis kebutuhan sistem dilakukan untuk mengidentifikasi kebutuhan pengguna serta fungsi-
```

fungsi yang harus disediakan oleh sistem pemetaan interaktif berbasis Sistem Informasi Geografis (SIG)

dalam mendukung manajemen krisis bencana gempa bumi di Kabupaten Bantul. Hasil analisis ini

menjadi dasar dalam proses perancangan dan pengembangan sistem.

**4.1.1. Analisis Kebutuhan Pengguna**

```
Analisis kebutuhan pengguna dilakukan untuk mengidentifikasi kebutuhan dari pihak-
pihak yang berinteraksi langsung dengan sistem yang dikembangkan. Pemahaman terhadap
kebutuhan ini bertujuan untuk memastikan bahwa sistem informasi geografis yang dibangun
mampu memberikan fungsi yang sesuai, mudah digunakan, serta bermanfaat dalam
mendukung manajemen krisis bencana gempa bumi. Berdasarkan hasil analisis yang dilakukan
melalui studi literatur, observasi, serta wawancara dengan pihak terkait, diperoleh beberapa
kebutuhan pengguna yang dapat diuraikan sebagai berikut:
```

1. Kebutuhan Pengguna Masyarakat
   a. Kemudahan dalam mengakses informasi gempa: Pengguna membutuhkan sistem
   yang mampu menampilkan informasi gempa secara cepat dan mudah dipahami,
   seperti lokasi, magnitudo, dan waktu kejadian.
   b. Visualisasi peta yang jelas dan informatif: Pengguna menginginkan tampilan peta
   yang interaktif dengan penanda zona risiko yang mudah dikenali, seperti zona
   merah, kuning, dan hijau.
   c. Panduan jalur evakuasi yang optimal: Pengguna membutuhkan fitur yang mampu
   memberikan rute evakuasi terbaik menuju shelter terdekat berdasarkan lokasi
   pengguna.
   d. Informasi shelter yang akurat: Pengguna mengharapkan adanya informasi terkait
   lokasi, kapasitas, dan kondisi shelter yang dapat digunakan saat kondisi darurat.

```
e. Deteksi lokasi pengguna secara otomatis: Sistem diharapkan mampu mendeteksi
posisi pengguna secara otomatis untuk mendukung proses penentuan rute
evakuasi.
f. Antarmuka yang mudah digunakan: Pengguna menginginkan tampilan sistem yang
sederhana, jelas, dan mudah digunakan, terutama dalam kondisi darurat.
g. Pemberian notifikasi gempa: Pengguna membutuhkan sistem yang dapat
memberikan peringatan dini ketika terjadi gempa bumi.
```

2. Kebutuhan Pengguna Admin
   a. Kemudahan dalam pengelolaan data system: Admin membutuhkan sistem yang
   dapat mempermudah proses pengelolaan data seperti data gempa, zona risiko,
   jaringan jalan, dan shelter.
   b. Pengelolaan data yang terstruktur: Sistem diharapkan memiliki alur pengelolaan
   data yang jelas, mulai dari penambahan, pengeditan, hingga penghapusan data.
   c. Kemudahan pembaruan informasi: Admin memerlukan fitur untuk memperbarui
   data secara berkala agar informasi yang disajikan tetap akurat dan relevan.
   d. Dashboard yang informatif: Admin menginginkan tampilan dashboard yang dapat
   memberikan gambaran kondisi sistem secara ringkas dan mudah dipahami.
3. Kebutuhan Pengguna Petugas Shelter
   a. Pengelolaan kapasitas shelter: Petugas membutuhkan sistem untuk memperbarui
   jumlah kapasitas dan jumlah pengungsi yang berada di shelter.
   b. Pembaruan status shelter: Sistem harus memungkinkan petugas untuk
   memperbarui status shelter, seperti tersedia, penuh, atau tidak dapat digunakan.
   c. Kemudahan penggunaan system: Petugas menginginkan sistem yang mudah
   digunakan agar dapat melakukan pembaruan data dengan cepat, terutama dalam
   kondisi darurat.

**4.1.2. Identifikasi Aktor Sistem**

```
Berdasarkan hasil analisis kebutuhan, terdapat tiga aktor utama yang berinteraksi dengan
sistem, yaitu sebagai berikut.
```

1. Masyarakat (User)

```
Masyarakat merupakan pengguna utama sistem yang memanfaatkan layanan untuk
memperoleh informasi terkait daerah rawan gempa, jalur evakuasi, titik evakuasi, serta
fasilitas umum yang tersedia. Aktor ini berperan sebagai penerima informasi, baik dalam
situasi mitigasi maupun pada saat tanggap darurat bencana.
```

2. Admin
   Admin bertanggung jawab atas pengelolaan seluruh data yang terdapat dalam
   sistem, meliputi data zona rawan gempa, titik evakuasi, jalur evakuasi, dan fasilitas umum.
   Selain itu, admin bertugas melakukan pembaruan data secara berkala guna memastikan
   informasi yang ditampilkan tetap akurat dan terkini.
3. Petugas Shelter
   Petugas shelter merupakan pihak yang bertanggung jawab terhadap kondisi dan
   ketersediaan fasilitas pada titik evakuasi. Aktor ini memiliki kewenangan untuk mengelola
   informasi terkait kapasitas shelter, kondisi fasilitas yang tersedia, serta status
   ketersediaan tempat pada setiap titik evakuasi.

**4.1.3. Kebutuhan Fungsional Sistem**

```
Kebutuhan fungsional merupakan fungsi atau layanan yang harus disediakan oleh sistem
agar dapat memenuhi kebutuhan pengguna. Kebutuhan ini disusun berdasarkan hasil analisis
terhadap aktor yang terlibat dalam sistem, yaitu masyarakat, admin, dan Petugas shelter.
Berikut adalah kebutuhan fungsional sistem yang diidentifikasi:
Tabel 4. 1 Kebutuhan Fungsional Sistem
Kode Aktor Kebutuhan Fungsional Deskripsi
KF- 01 Masyarakat Melihat Peta Sistem menampilkan
peta wilayah Bantul
secara interaktif
```

KF- 02 Masyarakat Visualisasi Data Gempa Menampilkan data
gempa dari BMKG
KF- 03 Masyarakat Analisis Frekuensi Gempa Menampilkan tingkat
frekuensi gempa
KF- 04 Masyarakat Melihat Zona Risiko Menampilkan zona risiko
berdasarkan data BPBD
KF- 05 Masyarakat Menentukan Jalur Evakuasi Sistem memberikan rute
evakuasi optimal

KF- 06 Masyarakat Melihat Rute Alternatif Menampilkan alternatif
jalur evakuasi

KF- 07 Masyarakat Deteksi Lokasi (^) Mengambil lokasi
pengguna secara
otomatis
KF- 08 Masyarakat Notifikasi Gempa (^) Mengirim notifikasi
saat terjadi gempa
KF- 09 Masyarakat Informasi Zona Dampak Menampilkan zona
merah, kuning, hijau
KF- 10 Masyarakat Rekomendasi Tindakan Memberikan instruksi
sesuai zona
KF- 11 Masyarakat Informasi Shelter Menampilkan lokasi dan
kapasitas shelter
KF- 12 Admin Kelola Data Jalan Admin mengelola data
jalan
KF- 13 Admin Update Kondisi Jalan Admin memperbarui
kondisi jalan
KF- 14 Admin Kelola Data Shelter Admin mengelola data
shelter
KF- 15 Admin Kelola Data Gempa Admin mengelola data
gempa
KF- 16 Petugas Shelter Update Kapasitas Shelter Petugas memperbarui
kapasitas shelter

```
KF- 17 Petugas Shelter Update Status Shelter Petugas memperbarui
status shelter
```

```
Berdasarkan Tabel 4.1 kebutuhan fungsional yang telah disusun, sistem yang
dikembangkan memiliki tiga aktor utama, yaitu masyarakat, admin, dan petugas shelter,
dengan fungsi yang berbeda sesuai dengan peran masing-masing.
Pada sisi masyarakat, sistem menyediakan berbagai fitur utama yang berfokus pada
penyajian informasi spasial dan dukungan pengambilan keputusan dalam kondisi bencana.
Fitur tersebut meliputi visualisasi peta wilayah Bantul, penampilan data gempa dari BMKG,
analisis frekuensi kejadian gempa, serta visualisasi zona risiko bencana. Selain itu, sistem juga
menyediakan kemampuan untuk menentukan jalur evakuasi optimal beserta rute alternatif,
deteksi lokasi pengguna secara otomatis, serta pemberian notifikasi saat terjadi gempa.
Informasi tambahan seperti zona dampak (merah, kuning, hijau), rekomendasi tindakan, dan
informasi shelter juga disediakan untuk meningkatkan kesiapsiagaan pengguna.
Pada sisi admin, kebutuhan fungsional berfokus pada pengelolaan data yang digunakan
dalam sistem. Admin memiliki kewenangan untuk mengelola data jalan, memperbarui kondisi
jalan, mengelola data shelter, serta mengelola data gempa. Peran ini penting untuk
memastikan bahwa data yang digunakan dalam sistem selalu akurat dan terkini sehingga hasil
analisis dan informasi yang disajikan dapat diandalkan.
Sementara itu, pada sisi petugas shelter, sistem menyediakan fitur untuk memperbarui
kapasitas dan status shelter. Fitur ini memungkinkan petugas untuk memberikan informasi
terbaru terkait ketersediaan tempat evakuasi, sehingga dapat membantu masyarakat dalam
menentukan lokasi evakuasi yang tepat.
Secara keseluruhan, kebutuhan fungsional yang dirancang tidak hanya berfokus pada
penyajian informasi, tetapi juga pada aspek analisis dan respons terhadap bencana, sehingga
sistem dapat mendukung manajemen krisis gempa bumi secara lebih efektif dan terintegrasi.
```

**4.1.4. Kebutuhan Non-Fungsional Sistem**

```
Kebutuhan non-fungsional merupakan kebutuhan yang berkaitan dengan kualitas dan
karakteristik sistem yang harus dipenuhi agar sistem dapat berjalan dengan baik. Kebutuhan
ini mencakup aspek performa, keamanan, kemudahan penggunaan, serta keandalan sistem.
Berikut adalah kebutuhan non-fungsional yang harus dipenuhi oleh sistem:
```

```
Tabel 4. 2 Kebutuhan Non-Fungsional Sistem
Kode Aspek Deskripsi
NF- 01 Usability Sistem harus mudah digunakan oleh masyarakat umum
tanpa memerlukan pelatihan khusus
NF- 02 Performance Sistem harus mampu menampilkan peta dan data
secara cepat dengan waktu respon yang singkat
NF- 03 Accessibility Sistem dapat diakses melalui web browser pada
berbagai perangkat tanpa instalasi tambahan
NF- 04 Reliability Sistem harus dapat berjalan secara stabil tanpa
mengalami error saat digunakan
NF- 05 Security Sistem menyediakan mekanisme login untuk admin dan
petugas shelter
NF- 06 Scalability Sistem dapat dikembangkan lebih lanjut untuk
penambahan fitur di masa depan
NF- 07 Availability Sistem dapat diakses kapan saja selama terkoneksi
dengan internet
```

```
Kebutuhan non-fungsional pada sistem ini berfokus pada peningkatan kualitas layanan
dan pengalaman pengguna. Aspek usability menjadi penting karena sistem ditujukan untuk
masyarakat umum yang membutuhkan kemudahan dalam mengakses informasi bencana.
Selain itu, performa sistem juga menjadi perhatian utama agar informasi spasial dapat
ditampilkan secara cepat, terutama dalam kondisi darurat.
Dari sisi keandalan dan ketersediaan, sistem diharapkan mampu berjalan secara stabil dan
dapat diakses kapan saja. Aspek keamanan juga diperhatikan melalui penerapan sistem login
untuk admin dan petugas shelter guna menjaga integritas data. Dengan adanya kebutuhan
non-fungsional ini, sistem diharapkan dapat memberikan layanan yang optimal, responsif , dan
dapat diandalkan dalam mendukung manajemen krisis bencana gempa bumi.
```

**4.2. Hasil Perancangan Sistem**

**4.2.1.** **_Use Case Diagram_**

_Use case diagram_ digunakan untuk menggambarkan interaksi antara aktor dengan sistem
yang dikembangkan. Diagram ini memberikan gambaran mengenai fungsi-fungsi utama sistem
serta hubungan antara pengguna dengan layanan yang disediakan.
Pada sistem ini terdapat tiga aktor utama, yaitu masyarakat, admin, dan petugas shelter.
Masing-masing aktor memiliki peran yang berbeda sesuai dengan kebutuhan sistem.

## Gambar 4. 1 Use Case Diagram

Pada Gambar 4.1, sistem melibatkan tiga aktor utama yang masing-masing memiliki
peran dan hak akses tersendiri, yaitu masyarakat, admin, dan petugas shelter. Masyarakat
bertindak sebagai pengguna inti yang memanfaatkan sistem untuk keperluan informasi
seputar gempa bumi. Beberapa fitur tersedia bagi mereka, antara lain melihat peta beserta

```
zona risikonya, mengakses informasi gempa terkini, menentukan jalur evakuasi yang tepat,
membaca materi edukasi kebencanaan, hingga mendapatkan notifikasi gempa secara
langsung. Fitur-fitur ini dihadirkan guna mendorong kesiapsiagaan warga sebelum maupun
saat bencana terjadi.
Di sisi lain, admin memegang kendali atas pengelolaan data dalam sistem. Selain dapat
memantau dashboard analisis secara menyeluruh, admin berwenang mengelola berbagai data
penting seperti data gempa, data jalan dan fasilitas umum, serta data induk shelter. Admin
juga bertugas menyebarkan peringatan dini kepada seluruh pengguna sistem. Dengan
demikian, keberadaan admin menjadi kunci dalam memastikan data yang tersaji tetap akurat
dan mutakhir.
Adapun petugas shelter memiliki tanggung jawab khusus dalam memperbarui kondisi
shelter secara berkala. Setelah masuk ke dalam sistem, petugas shelter dapat mengelola status
dan kapasitas shelter yang tersedia, sekaligus mencatat data para pengungsi yang datang.
Informasi yang mereka masukkan nantinya akan digunakan sistem untuk menyampaikan
kondisi ketersediaan tempat evakuasi kepada masyarakat secara real-time.
Secara keseluruhan, use case diagram ini memperlihatkan bahwa sistem dirancang lebih
dari sekadar penyedia informasi. Sistem ini juga berperan sebagai sarana pendukung
pengambilan keputusan dan koordinasi lintas pihak dalam penanganan krisis bencana gempa
bumi secara terpadu.
```

**4.2.2. Activity Diagram**

1. Activity Diagram Penentuan Jalur Evakuasi

## Gambar 4. 2 Activity Diagram Penentuan Jalur Evakuasi

Gambar 4.2 memperlihatkan activity diagram yang menggambarkan alur proses
penentuan jalur evakuasi di dalam sistem. Proses ini berawal ketika pengguna menerima
notifikasi gempa lalu membuka sistem, yang kemudian langsung menampilkan peta
beserta informasi seputar kondisi gempa yang sedang terjadi.
Setelah itu, pengguna memilih fitur jalur evakuasi yang tersedia. Sistem pun
merespons dengan meminta izin akses lokasi kepada pengguna. Begitu izin diberikan,
sistem segera memproses dan memvalidasi koordinat lokasi pengguna tersebut. Dari hasil
validasi itulah sistem menentukan apakah posisi pengguna termasuk dalam zona
berbahaya atau tidak. Apabila pengguna terdeteksi berada di zona merah, sistem akan
menyarankan agar pengguna tetap bertahan di tempat yang dianggap aman. Sebaliknya,
jika lokasi pengguna dinilai masih memungkinkan untuk bergerak, sistem akan secara
otomatis mencari shelter terdekat dan menampilkan rute evakuasi yang bisa ditempuh.

```
Alur kerja seperti ini memungkinkan sistem untuk hadir sebagai panduan praktis bagi
pengguna dalam mengambil keputusan secara cepat dan tepat di tengah situasi darurat
bencana gempa bumi.
```

2. Activity Diagram Manajemen Data Shelter

## Gambar 4. 3 Activity Diagram Manajemen Data Shelter

```
Gambar 4.3 menampilkan alur proses pengelolaan data shelter yang dilakukan oleh
admin dalam sistem. Proses dimulai ketika admin mengakses sistem dan kemudian
diarahkan ke halaman login. Pada tahap ini, admin memasukkan email dan password yang
```

```
selanjutnya akan diverifikasi oleh sistem. Apabila data yang dimasukkan tidak sesuai,
sistem akan menampilkan pesan kesalahan dan admin diminta untuk melakukan login
kembali. Namun, jika data yang dimasukkan valid, maka sistem akan menampilkan
halaman dashboard sebagai halaman utama admin. Setelah berhasil masuk ke dalam
sistem, admin dapat melakukan pengelolaan data shelter dengan memilih menu untuk
menambahkan data baru. Sistem kemudian akan menampilkan form input yang
digunakan untuk memasukkan data shelter. Setelah data diinput, sistem akan menyimpan
data tersebut dan menampilkan informasi terbaru.
Selain menambahkan data, admin juga dapat melakukan perubahan terhadap data
shelter yang sudah ada. Proses ini dimulai dengan memilih data yang akan diedit,
kemudian sistem menampilkan form edit. Admin dapat melakukan perubahan data, dan
sistem akan menyimpan hasil perubahan tersebut serta memperbarui tampilan data.
Melalui alur ini, sistem memungkinkan admin untuk mengelola data shelter secara lebih
terstruktur sehingga informasi yang tersedia tetap akurat dan dapat digunakan oleh
pengguna.
```

3. Activity Diagram Visualisasi Peta Zona Bahaya Gempa

## Gambar 4. 4 Activity Diagram Visualisasi Peta Zona Bahaya Gempa

```
Gambar 4.4 memperlihatkan alur proses visualisasi peta zona bahaya gempa yang
dapat diakses oleh pengguna. Proses diawali ketika pengguna membuka sistem peta,
kemudian sistem secara otomatis menampilkan halaman utama yang berisi tampilan peta
wilayah. Setelah halaman utama ditampilkan, sistem memuat data yang berkaitan dengan
zona bahaya gempa. Data tersebut kemudian ditampilkan dalam bentuk polygon pada
peta, sehingga pengguna dapat melihat persebaran tingkat risiko secara visual. Pengguna
selanjutnya dapat berinteraksi dengan peta dengan memilih area tertentu atau titik
kejadian gempa. Berdasarkan pilihan tersebut, sistem akan menampilkan informasi detail
mengenai tingkat risiko pada area yang dipilih.
Dengan adanya fitur ini, pengguna dapat memahami kondisi wilayah secara lebih
jelas melalui visualisasi peta serta memperoleh informasi yang mendukung dalam
pengambilan keputusan terkait mitigasi bencana.
```

4. Activity Diagram Pengelolaan Data Infrastruktur

## Gambar 4. 5 Activity Diagram Pengelolaan Data Infrastruktur

Gambar 4.5 menunjukkan alur proses pengelolaan data infrastruktur yang dilakukan
oleh admin dalam sistem. Proses diawali ketika admin mengakses sistem dan melakukan
login dengan memasukkan email serta password. Sistem kemudian melakukan validasi
terhadap data yang dimasukkan untuk memastikan keabsahan akses. Apabila data login
tidak valid, sistem akan menampilkan pesan kesalahan dan admin diminta untuk
melakukan login kembali. Sebaliknya, jika data yang dimasukkan sesuai, maka sistem akan
menampilkan halaman dashboard sebagai halaman utama.

```
Setelah berhasil masuk ke dalam sistem, admin dapat mengakses menu data
infrastruktur untuk melihat informasi yang tersedia. Sistem akan menampilkan tabel data
infrastruktur, seperti kondisi jalan atau fasilitas umum yang terdampak. Admin kemudian
dapat melakukan penambahan atau perubahan data. Proses dimulai dengan memilih fitur
tambah atau edit data, kemudian admin memasukkan informasi yang diperlukan. Sistem
akan melakukan validasi terhadap data yang dimasukkan sebelum menyimpannya ke
dalam database.
Setelah data berhasil disimpan, sistem akan menampilkan notifikasi keberhasilan
serta memperbarui tampilan data infrastruktur. Dengan adanya proses ini, pengelolaan
data dapat dilakukan secara terstruktur sehingga informasi yang tersedia dalam sistem
tetap akurat dan terkini.
```

**4.2.3. ERD (** **_Entity Relationship Diagram_** **)**

## Gambar 4. 6 ERD (Entity Relationship Diagram)

```
Pada gambar 4.6 menunjukkan perancangan basis data yang digunakan dalam sistem
informasi geografis untuk manajemen krisis gempa bumi. Diagram ini menggambarkan
hubungan antar entitas yang saling terintegrasi dalam mendukung proses analisis dan
evakuasi. Secara umum, data gempa yang tersimpan pada tabel Earthquake menjadi dasar
utama dalam sistem. Data ini digunakan untuk menentukan zona bahaya yang
direpresentasikan dalam tabel HazardZone dan BpbdRiskZone. Kedua tabel tersebut
menggambarkan tingkat risiko wilayah dalam bentuk spasial. Selanjutnya, data zona risiko
berhubungan dengan jaringan jalan pada tabel Road. Informasi ini digunakan untuk
mengidentifikasi jalur yang berpotensi berbahaya melalui proses analisis spasial. Data jalan
kemudian dimanfaatkan dalam proses perhitungan rute evakuasi yang disimpan pada tabel
EvacuationRoute.
Selain itu, tabel Shelter berfungsi sebagai lokasi tujuan evakuasi. Data shelter mencakup
kapasitas dan kondisi yang digunakan untuk menentukan kelayakan sebagai tempat
evakuasi. Shelter juga berhubungan dengan pengguna tertentu, khususnya petugas yang
bertanggung jawab dalam pengelolaan data tersebut.
Pada sisi pengguna, tabel User digunakan untuk menyimpan informasi pengguna sistem.
Data ini terhubung dengan tabel PushSubscription yang digunakan untuk mengelola
pengiriman notifikasi gempa kepada pengguna. Secara keseluruhan, relasi antar tabel dalam
basis data ini mendukung proses integrasi data spasial dan non-spasial, sehingga sistem
dapat memberikan informasi yang akurat serta membantu pengguna dalam mengambil
keputusan saat terjadi bencana.
```

**_4.2.4. Class Diagram_**

## Gambar 4. 7 Sequence Diagram Pencarian Rute Evakuasi

```
Gambar 4.7 memperlihatkan class diagram yang menggambarkan struktur serta
hubungan antar komponen dalam sistem. Diagram ini dibagi ke dalam tiga layer utama, yaitu
Controller, Service, dan Entity , yang masing-masing mengemban tanggung jawab tersendiri
sesuai pola arsitektur yang digunakan.
Layer Controller berada di posisi teratas dan berfungsi sebagai penerima request dari
pengguna melalui endpoint API. Pada layer ini terdapat dua controller , yakni
EvacuationController yang menangani permintaan pencarian rute evakuasi, dan
EarthquakeController yang memproses permintaan data gempa terkini sekaligus memicu
webhook ketika gempa terdeteksi.
Di bawahnya terdapat layer Service yang menjadi tempat berjalannya seluruh logika
bisnis sistem. EarthquakeService menangani pengambilan data gempa dari BMKG,
penyimpanannya ke database , serta perhitungan radius dan zona bahaya berdasarkan
koordinat yang diperoleh. EvacuationService bertugas mencari shelter terdekat dan
menghitung rute evakuasi paling aman dengan memanfaatkan algoritma pgRouting.
ShelterService mengelola operasi data shelter mulai dari penambahan, pembaruan, hingga
```

```
penghapusan. Adapun NotificationService bertanggung jawab menyimpan data subscription
pengguna sekaligus mengirimkan push notification darurat melalui protokol VAPID.
Layer Entity berada di posisi paling bawah dan merepresentasikan data yang tersimpan
dalam database. Terdapat empat entitas utama di dalamnya. User menyimpan informasi akun
beserta peran masing-masing pengguna. Earthquake mencatat data gempa seperti magnitudo,
kedalaman, dan koordinat kejadian. Shelter menyimpan informasi tempat evakuasi termasuk
kapasitas dan data spasialnya. Sementara Road memuat data jaringan jalan lengkap dengan
kondisi serta biaya lintasan yang diperlukan dalam proses routing.
Dari sisi relasi antar komponen, Controller dihubungkan ke Service melalui garis putus-
putus yang mencerminkan ketergantungan sementara, di mana controller hanya memanggil
service pada saat memproses request yang masuk. Berbeda dengan itu, Service dihubungkan
ke Entity menggunakan garis solid yang menandakan kepemilikan langsung, karena setiap
service bertanggung jawab penuh atas pengelolaan entitas yang berkaitan. Selain itu,
EvacuationService juga memanfaatkan ShelterService dan EarthquakeService secara
bersamaan dalam menjalankan proses penentuan rute evakuasi secara menyeluruh.
```

**_4.2.5. Sequence Diagram_**

1. Sequence Diagram Pencarian Rute Evakuasi

## Gambar 4. 9 Sequence Diagram Manajemen Data Shelter

```
Gambar 4. 8 menunjukkan alur interaksi antar komponen dalam proses pencarian
rute evakuasi, mencakup komunikasi antara pengguna, antarmuka sistem, layanan
backend , serta database.
Proses diawali ketika pengguna memilih fitur pencarian jalur evakuasi melalui
antarmuka peta, lalu sistem meminta izin akses lokasi pengguna sebagai titik awal
evakuasi. Setelah lokasi diperoleh, antarmuka mengirim permintaan ke backend untuk
mengambil data gempa terbaru dari database, yang kemudian dikembalikan dalam
bentuk informasi koordinat episentrum.
Data tersebut digunakan sistem untuk menghitung jarak antara posisi pengguna
dengan pusat gempa guna menentukan zona risiko. Jika pengguna terdeteksi berada di
```

```
zona merah, sistem menampilkan peringatan agar tetap berada di tempat aman dan
proses pencarian rute dihentikan. Sebaliknya, jika posisi pengguna berada di luar zona
berbahaya, sistem melanjutkan proses dengan mencari shelter terdekat yang masih
memiliki kapasitas tersedia, lalu menghitung rute paling aman berdasarkan data jaringan
jalan yang tersimpan di database.
Hasil perhitungan rute kemudian dikirim ke antarmuka dan ditampilkan pada peta
lengkap dengan informasi arah navigasi serta estimasi waktu tempuh. Melalui alur ini,
sistem mampu membantu pengguna mengambil keputusan evakuasi secara cepat dan
tepat saat bencana terjadi.
```

## Gambar 4. 8 Sequence Diagram: Penerimaan Notifikasi Web Push

```
Gambar 4. 9 Sequence Diagram: Penerimaan Notifikasi Web Push
Gambar 4. 9 menunjukkan alur proses pengiriman notifikasi gempa kepada
pengguna melalui sistem. Proses dimulai ketika sistem menerima data gempa terbaru,
kemudian data tersebut disimpan ke dalam database. Selanjutnya, sistem mengambil
daftar pengguna yang telah terdaftar untuk menerima notifikasi. Informasi tersebut
digunakan untuk mengirimkan pesan melalui layanan push notification. Notifikasi yang
dikirim akan diteruskan ke service worker pada sisi pengguna. Service worker kemudian
```

```
menentukan cara menampilkan notifikasi berdasarkan kondisi aplikasi. Jika aplikasi
sedang aktif, notifikasi akan ditampilkan langsung di dalam antarmuka. Namun, jika
aplikasi tidak aktif, notifikasi akan ditampilkan melalui sistem perangkat pengguna.
```

3. Sequence Diagram Manajemen Data Shelter

```
Gambar 4. 10 Sequence Diagram Manajemen Data Shelter
Gambar 4. 10 menggambarkan proses penambahan data shelter yang dilakukan oleh
admin melalui sistem. Proses dimulai ketika admin mengisi form yang berisi informasi
shelter, seperti nama, kapasitas, dan koordinat lokasi. Setelah data diisi, admin
menyimpan data tersebut melalui antarmuka sistem. Permintaan kemudian dikirim ke
backend untuk diproses lebih lanjut. Pada tahap ini, sistem terlebih dahulu melakukan
validasi terhadap token autentikasi untuk memastikan bahwa pengguna memiliki hak
akses sebagai admin.
Jika token tidak valid atau telah kedaluwarsa, sistem akan menolak permintaan dan
menampilkan pesan kesalahan. Namun, jika validasi berhasil, sistem akan memproses
data yang dikirim, termasuk mengolah koordinat lokasi sebelum disimpan ke dalam
database. Setelah data berhasil disimpan, sistem mengirimkan respons keberhasilan ke
antarmuka. Selanjutnya, tampilan sistem akan diperbarui dan notifikasi keberhasilan
ditampilkan kepada admin sebagai tanda bahwa data shelter telah berhasil ditambahkan.
```

**4.3. Implementasi Sistem**

**4.3.1. Implementasi Antarmuka Pengguna**

1. Halaman Dashboard Pengguna
   Pada bagian ini dijelaskan implementasi antarmuka pengguna yang terdapat pada
   sistem yang telah dibangun. Setiap halaman dirancang untuk mendukung kebutuhan
   pengguna dalam mengakses informasi terkait mitigasi bencana gempa.

```
Gambar 4. 11 Desain Antarmuka Halaman Dashboard User
Gambar 4. 11 menyajikan antarmuka dashboard yang berfungsi sebagai pusat
informasi utama sistem. Halaman ini dioptimalkan untuk menyajikan data gempa dan
kondisi wilayah secara visual dan efisien. Fokus utama halaman terletak pada peta
interaktif yang menggunakan kategorisasi warna untuk mengidentifikasi zona risiko
secara instan. Selain itu, panel analitik yang memuat grafik magnitudo serta ringkasan
```

peringatan dini membantu pengguna memantau aktivitas seismik terkini. Pada bagian
bawah, tersedia indikator krusial seperti tingkat keamanan dan ketersediaan shelter
untuk mempercepat pengambilan keputusan saat situasi darurat. Akses ke fitur
pendukung lainnya, seperti manajemen evakuasi dan edukasi, dipermudah melalui bilah
navigasi di sisi kiri.

# BAB V. KESIMPULAN DAN SARAN

**5.1. Kesimpulan**

```
Kesimpulan memuat secara singkat dan jelas tentang hasil penelitian yang diperoleh sesuai dengan
```

tujuan penelitian. Kesimpulan merupakan rangkuman hasil yang dicapai dan merupakan jawaban

rumusan masalah.

**5.2. Saran**

```
Saran berisi hal-hal atau masalah yang perlu disampaikan untuk penelitian lebih lanjut. Bagian ini
```

menguraikan saran‐saran yang perlu diperhatikan berdasarkan keterbatasan yang ditemukan dan

asumsi yang dibuat, termasuk saran untuk pengembangan lebih lanjut.

# DAFTAR PUSTAKA

```
Daftar Pustaka disajikan pada halaman tersendiri dengan judul ‘DAFTAR PUSTAKA’, diketik dengan
```

huruf kapital dan diletakkan pada sisi kiri halaman. Daftar Pustaka memuat semua pustaka yang

digunakan dalam penelitian. penulisan daftar pustaka mengacu pada sistem angka IEEE dan diurutkan

sesuai dengan sitasi yang dilakukan. Berikut merupakan contoh penulisan daftar pustaka

menggunakan format IEEE. Gunakan style Daftar Acuan.

[1] G. Eason, B. Noble, and I. N. Sneddon, “On certain integrals of Lipschitz-Hankel type involving
products of Bessel functions,” Phil. Trans. Roy. Soc. London, vol. A247, pp. 529–551, April

1955. (references)
      [2] J. Clerk Maxwell, A Treatise on Electricity and Magnetism, 3rd ed., vol. 2. Oxford: Clarendon,
      1892, pp.68–73.
      [3] I. S. Jacobs and C. P. Bean, “Fine particles, thin films and exchange anisotropy,” in
      Magnetism, vol. III, G. T. Rado and H. Suhl, Eds. New York: Academic, 1963, pp. 271–350.
      [4] K. Elissa, “Title of paper if known,” unpublished.
      [5] R. Nicole, “Title of paper with only first word capitalized,” J. Name Stand. Abbrev., in press.
      [6] Y. Yorozu, M. Hirano, K. Oka, and Y. Tagawa, “Electron spectroscopy studies on magneto-
      optical media and plastic substrate interface,” IEEE Transl. J. Magn. Japan, vol. 2, pp. 740–
      741, August 1987 [Digests 9th Annual Conf. Magnetics Japan, p. 301, 1982].
      [7] M. Young, The Technical Writer’s Handbook. Mill Valley, CA: University Science, 1989.

# LAMPIRAN

```
Lampiran berisi dokumen-dokumen yang digunakan sebagai pendukung penelitian, seperti
```

dokumen pengujian. Berikut contoh penulisan lampiran untuk Skripsi Berbasis Publikasi.

**Lampiran 1. Bukti Pernyataan Diterima (ACCEPTED)**

**Lampiran 2. Bukti Terakreditasi atau Terindeks SCOPUS**

**Lampiran 3. Bukti Bayar (untuk jurnal yang berbayar)**
