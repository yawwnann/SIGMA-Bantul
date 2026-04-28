# Product Requirements Document (PRD)

## Fitur Petugas Shelter

---

## 1. Deskripsi Umum

Fitur Petugas Shelter merupakan bagian dari sistem yang digunakan untuk mendukung operasional evakuasi dengan memungkinkan petugas lapangan mengelola dan memperbarui informasi terkait shelter secara real-time. Fitur ini bertujuan untuk memastikan data shelter selalu akurat sehingga dapat digunakan dalam proses pengambilan keputusan, khususnya dalam penentuan jalur evakuasi.

---

## 2. Tujuan Fitur

Tujuan dari fitur Petugas Shelter adalah:

1. Memastikan setiap shelter memiliki petugas yang bertanggung jawab
2. Menyediakan data kondisi shelter secara real-time
3. Mendukung sistem dalam menentukan rute evakuasi yang optimal
4. Meningkatkan efisiensi pengelolaan pengungsi

---

## 3. Aktor

- Petugas Shelter
- Administrator

---

## 4. Hak Akses

| Aktor   | Hak Akses                                       |
| ------- | ----------------------------------------------- |
| Admin   | Mengelola data petugas dan seluruh shelter      |
| Petugas | Mengakses dan mengelola shelter yang ditugaskan |

---

## 5. Fitur Utama

### 5.1 Login Petugas

Petugas dapat masuk ke sistem menggunakan akun yang telah didaftarkan oleh administrator. Sistem akan melakukan autentikasi dan memberikan akses sesuai dengan peran pengguna.

---

### 5.2 Melihat Data Shelter

Petugas dapat melihat informasi shelter yang menjadi tanggung jawabnya, meliputi:

- Nama shelter
- Kapasitas
- Jumlah pengungsi
- Kondisi shelter

---

### 5.3 Update Kondisi Shelter

Petugas dapat memperbarui kondisi shelter dengan kategori:

- Baik
- Sedang
- Rusak / Darurat

---

### 5.4 Update Kapasitas Shelter

Petugas dapat menginput jumlah pengungsi saat ini, sehingga sistem dapat mengetahui ketersediaan kapasitas shelter.

---

### 5.5 Update Status Operasional

Petugas dapat mengubah status shelter menjadi:

- Aktif
- Siaga
- Tidak tersedia

---

### 5.6 Monitoring Data Evakuasi

Petugas dapat melihat:

- Data zona bahaya
- Rute evakuasi
- Informasi gempa terbaru

---

### 5.7 Pencatatan Aktivitas (Log)

Sistem mencatat setiap perubahan data yang dilakukan oleh petugas untuk keperluan monitoring dan audit.

---

## 6. Alur Proses Utama

1. Petugas melakukan login ke sistem
2. Sistem memverifikasi kredensial pengguna
3. Petugas mengakses data shelter yang ditugaskan
4. Petugas melakukan pembaruan data (kondisi, kapasitas, status)
5. Sistem menyimpan perubahan ke database
6. Data digunakan oleh sistem dalam analisis evakuasi

---

## 7. Kebutuhan Fungsional

1. Sistem harus menyediakan autentikasi login
2. Sistem harus membatasi akses berdasarkan peran
3. Sistem harus menampilkan data shelter sesuai penugasan
4. Sistem harus menyimpan pembaruan data secara real-time
5. Sistem harus mencatat aktivitas pengguna

---

## 8. Kebutuhan Non-Fungsional

1. Sistem harus responsif dan mudah digunakan
2. Sistem harus memiliki keamanan berbasis role
3. Sistem harus mampu menangani data secara real-time
4. Sistem harus memiliki performa yang stabil

---

## 9. Integrasi dengan Sistem Lain

Fitur Petugas Shelter terintegrasi dengan:

- Sistem Evakuasi (Algoritma Dijkstra)
- Metode Weighted Overlay
- Perhitungan Haversine
- Perhitungan Radius Dampak Gempa

---

## 10. Output yang Dihasilkan

- Data kondisi shelter terkini
- Informasi kapasitas shelter
- Status operasional shelter
- Data pendukung analisis rute evakuasi

---
