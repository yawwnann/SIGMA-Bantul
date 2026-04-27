# Implementation Tasks: Shelter Officer Management

## Task List

- [x] 1. Database Schema Migration
  - [x] 1.1 Tambah field `officerId` (nullable) ke model Shelter di `schema.prisma` dengan relasi ke User
  - [x] 1.2 Tambah reverse relation `managedShelters` ke model User di `schema.prisma`
  - [x] 1.3 Buat dan jalankan Prisma migration untuk perubahan schema

- [x] 2. Backend - Officer Management Module
  - [x] 2.1 Buat `OfficerModule` di `backend/src/officer/`
  - [x] 2.2 Buat `OfficerService` dengan method: createOfficer, findAllOfficers, findOfficerById, updateOfficer, deleteOfficer
  - [x] 2.3 Buat `OfficerController` dengan endpoint CRUD officer (admin only)
  - [x] 2.4 Buat DTO: `CreateOfficerDto`, `UpdateOfficerDto`
  - [x] 2.5 Daftarkan `OfficerModule` ke `AppModule`

- [x] 3. Backend - Assignment Management
  - [x] 3.1 Tambah method `assignOfficer(shelterId, officerId)` ke `ShelterService`
  - [x] 3.2 Tambah method `unassignOfficer(shelterId)` ke `ShelterService`
  - [x] 3.3 Tambah endpoint `PUT /shelters/:id/assign` dan `DELETE /shelters/:id/assign` ke `ShelterController`
  - [x] 3.4 Update `findAll` dan `findById` di `ShelterService` untuk include data officer

- [x] 4. Backend - Officer Dashboard Endpoints
  - [x] 4.1 Buat `OfficerDashboardController` dengan endpoint `GET /officer/dashboard` dan `GET /officer/shelters`
  - [x] 4.2 Tambah method `updateOccupancyByOfficer` dengan validasi kepemilikan shelter
  - [x] 4.3 Tambah method `updateConditionByOfficer` dengan validasi kepemilikan shelter
  - [x] 4.4 Tambah endpoint `PATCH /officer/shelters/:id/occupancy` dan `PATCH /officer/shelters/:id/condition`
  - [x] 4.5 Implementasi guard `SHELTER_OFFICER` role untuk semua endpoint officer dashboard

- [ ] 5. Backend - Unit & Property Tests
  - [ ] 5.1 Tulis unit test untuk `OfficerService` (CRUD operations)
  - [ ] 5.2 Tulis property test untuk validasi role assignment (Property 3, 4, 6)
  - [ ] 5.3 Tulis property test untuk officer ownership validation (Property 20)
  - [ ] 5.4 Tulis property test untuk occupancy validation (Property 18, 19)

- [x] 6. Frontend - API Client
  - [x] 6.1 Buat `frontend/api/officer.ts` dengan fungsi API untuk officer management
  - [x] 6.2 Update `frontend/api/shelter.ts` untuk include data officer dalam response
  - [x] 6.3 Update `frontend/api/index.ts` untuk export officer API

- [ ] 7. Frontend - Admin Officer Management Page
  - [x] 7.1 Buat halaman `frontend/app/admin/officers/page.tsx` untuk list dan CRUD petugas
  - [x] 7.2 Tambah fitur assign/unassign officer di halaman `frontend/app/admin/shelters/page.tsx`
  - [x] 7.3 Tambah kolom "Petugas" di tabel shelter dan dropdown assign officer

- [x] 8. Frontend - Officer Dashboard Page
  - [x] 8.1 Buat layout `frontend/app/officer/layout.tsx` dengan auth guard SHELTER_OFFICER
  - [x] 8.2 Buat halaman `frontend/app/officer/dashboard/page.tsx` dengan daftar shelter yang dikelola
  - [x] 8.3 Buat komponen `ShelterCard` untuk menampilkan info shelter dan form update occupancy/condition
  - [x] 8.4 Tambah navigasi ke officer dashboard di middleware dan layout

- [x] 9. Frontend - Types Update
  - [x] 9.1 Update `frontend/types/models.ts` untuk tambah field `officer` di tipe Shelter
  - [x] 9.2 Tambah tipe `Officer`, `OfficerStats`, `DashboardResponse`

- [x] 10. Integration & Auth
  - [x] 10.1 Pastikan middleware `frontend/middleware.ts` handle redirect untuk role SHELTER_OFFICER
  - [x] 10.2 Verifikasi login flow untuk SHELTER_OFFICER role mengarah ke officer dashboard
