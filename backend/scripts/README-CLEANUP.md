# 🧹 Database Cleanup Scripts

Scripts untuk membersihkan data gempa dari database.

## 📋 Available Scripts

### 1. Simple Cleanup (Hapus Semua)

**Script:** `clean-earthquakes.ts`

Menghapus **SEMUA** data gempa dari database tanpa konfirmasi.

```bash
npm run db:clean-earthquakes
```

**⚠️ Warning:** Script ini akan langsung menghapus semua data tanpa konfirmasi!

**Output:**

```
🧹 Starting earthquake data cleanup...
📊 Total earthquakes in database: 1234
🗑️  Deleting earthquakes...
✅ Successfully deleted 1234 earthquake records
🎉 Database cleanup completed!
```

---

### 2. Advanced Cleanup (Dengan Opsi)

**Script:** `clean-earthquakes-advanced.ts`

Memberikan berbagai opsi pembersihan dengan konfirmasi interaktif.

```bash
npm run db:clean-earthquakes-advanced
```

**Opsi yang tersedia:**

1. **Delete ALL earthquakes**
   - Menghapus semua data gempa
   - Memerlukan konfirmasi `yes`

2. **Delete earthquakes older than 30 days**
   - Menghapus gempa yang lebih tua dari 30 hari
   - Menjaga data gempa terbaru

3. **Delete earthquakes older than 90 days**
   - Menghapus gempa yang lebih tua dari 90 hari
   - Untuk cleanup berkala

4. **Delete earthquakes older than 1 year**
   - Menghapus gempa yang lebih tua dari 1 tahun
   - Untuk arsip jangka panjang

5. **Keep only latest 100 earthquakes**
   - Menghapus semua kecuali 100 gempa terbaru
   - Berguna untuk development/testing

6. **Cancel**
   - Membatalkan operasi

**Output Example:**

```
🧹 Earthquake Data Cleanup Tool
================================

📊 Total earthquakes in database: 1234

📈 Database Statistics:
   Oldest: 2024-01-01T00:00:00.000Z - M5.2 Bantul
   Newest: 2024-12-30T12:00:00.000Z - M4.8 Yogyakarta

🔧 Cleanup Options:
   1. Delete ALL earthquakes
   2. Delete earthquakes older than 30 days
   3. Delete earthquakes older than 90 days
   4. Delete earthquakes older than 1 year
   5. Keep only latest 100 earthquakes
   6. Cancel

Select option (1-6): 5
📊 Will delete 1134 oldest earthquakes, keeping latest 100
Proceed? (yes/no): yes
✅ Deleted 1134 earthquakes, kept latest 100

📊 Final count: 100 earthquakes remaining
🎉 Cleanup completed!
```

---

## 🎯 Use Cases

### Development

```bash
# Hapus semua untuk testing fresh
npm run db:clean-earthquakes

# Atau keep 100 terbaru untuk testing
npm run db:clean-earthquakes-advanced
# Pilih opsi 5
```

### Production Maintenance

```bash
# Cleanup berkala (hapus data lama)
npm run db:clean-earthquakes-advanced
# Pilih opsi 2, 3, atau 4 sesuai kebutuhan
```

### Database Migration

```bash
# Hapus semua sebelum import data baru
npm run db:clean-earthquakes
```

---

## 🔒 Safety Features

### Simple Script

- ❌ Tidak ada konfirmasi
- ⚡ Eksekusi langsung
- 🎯 Untuk automation/CI/CD

### Advanced Script

- ✅ Konfirmasi interaktif
- 📊 Menampilkan statistik sebelum hapus
- 🔍 Preview jumlah data yang akan dihapus
- 🛡️ Opsi cancel
- 🎯 Untuk manual cleanup

---

## 📝 Notes

1. **Backup First!**

   ```bash
   # Backup database sebelum cleanup
   pg_dump -U postgres -d gis_bantul > backup_$(date +%Y%m%d).sql
   ```

2. **Check Count**

   ```bash
   # Cek jumlah gempa di database
   psql -U postgres -d gis_bantul -c "SELECT COUNT(*) FROM \"Earthquake\";"
   ```

3. **Restore if Needed**
   ```bash
   # Restore dari backup
   psql -U postgres -d gis_bantul < backup_20241230.sql
   ```

---

## 🚀 Quick Reference

| Task                     | Command                                 |
| ------------------------ | --------------------------------------- |
| Hapus semua (no confirm) | `npm run db:clean-earthquakes`          |
| Hapus dengan opsi        | `npm run db:clean-earthquakes-advanced` |
| Hapus > 30 hari          | Advanced script → opsi 2                |
| Hapus > 90 hari          | Advanced script → opsi 3                |
| Keep 100 terbaru         | Advanced script → opsi 5                |

---

## ⚠️ Important Warnings

1. **Data Loss**: Operasi ini **TIDAK BISA DI-UNDO**
2. **Production**: Selalu backup sebelum cleanup di production
3. **Testing**: Test di development environment dulu
4. **Cascade**: Pastikan tidak ada foreign key constraints yang akan error

---

## 🐛 Troubleshooting

### Error: Foreign Key Constraint

```
Error: Foreign key constraint failed
```

**Solution:** Tidak ada tabel lain yang reference ke Earthquake, jadi seharusnya aman.

### Error: Connection Refused

```
Error: Can't reach database server
```

**Solution:**

```bash
# Pastikan database running
docker-compose up -d postgres
# atau
npm run db:studio
```

### Error: Permission Denied

```
Error: Permission denied
```

**Solution:**

```bash
# Pastikan user memiliki DELETE permission
# Check di .env file DATABASE_URL
```

---

## 📚 Related Scripts

- `npm run db:seed` - Seed data awal
- `npm run db:studio` - Buka Prisma Studio
- `npm run db:migrate` - Run migrations

---

**Created:** 2024-12-30
**Last Updated:** 2024-12-30
**Version:** 1.0.0
