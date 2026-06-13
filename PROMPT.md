# GENERAL PROMPT – TRANSFORM DOCTIVA INTO MULTI-TENANT PLATFORM

Lakukan transformasi arsitektur DocTiva dari sistem administrasi single-company menjadi platform multi-tenant yang dapat digunakan oleh banyak perusahaan, lembaga pelatihan, maupun organisasi secara bersamaan.

Tujuan utama transformasi ini adalah agar setiap perusahaan memiliki lingkungan kerja masing-masing tanpa tercampur dengan perusahaan lain, namun tetap menggunakan satu aplikasi DocTiva yang sama.

---

# PRINSIP UTAMA

Implementasikan arsitektur multi-tenant tanpa mengubah pengalaman pengguna yang sudah ada.

Pertahankan:

* Desain UI
* Layout
* Navigasi
* Struktur menu
* Warna
* Komponen
* Workflow
* Pengalaman pengguna

Perubahan hanya dilakukan pada:

* Arsitektur data
* Autentikasi
* Otorisasi
* Isolasi tenant
* Branding tenant
* Pengaturan tenant

Seluruh fitur yang sudah ada harus tetap berjalan seperti sebelumnya.

---

# ARSITEKTUR PLATFORM

DocTiva memiliki 2 level utama:

## 1. PLATFORM

Pemilik aplikasi DocTiva.

Hanya digunakan oleh owner DocTiva.

Tidak digunakan untuk operasional perusahaan.

Berfungsi untuk mengelola tenant.

---

## 2. TENANT

Perusahaan, lembaga pelatihan, organisasi, atau unit bisnis yang menggunakan DocTiva.

Contoh:

* PT Activa
* PT ABC
* PT XYZ
* SMK Ekonomika
* Kelas Pelatihan Batch 1
* Kelas Pelatihan Batch 2

Setiap tenant memiliki data yang terpisah sepenuhnya.

---

# PLATFORM SUPER ADMIN

Buat role khusus:

Platform Super Admin

Role ini hanya dimiliki oleh pemilik DocTiva.

Platform Super Admin TIDAK memiliki menu:

* Pelanggan
* Invoice
* Kwitansi
* Surat Menyurat
* Arsip Operasional

Karena Platform Super Admin bukan pengguna operasional.

---

# MENU PLATFORM SUPER ADMIN

Tampilkan menu berikut:

Dashboard Platform

Tenant Management

Statistik Platform

Pengaturan Platform

Audit Platform

Profil Saya

---

# DASHBOARD PLATFORM

Tampilkan informasi:

* Total Tenant
* Tenant Aktif
* Tenant Nonaktif
* Total Pengguna
* Total Invoice Seluruh Tenant
* Total Kwitansi Seluruh Tenant
* Total Dokumen Surat Menyurat
* Total Penyimpanan Digunakan

Grafik:

* Pertumbuhan Tenant
* Aktivitas Tenant
* Tenant Teraktif

Dashboard ini hanya bersifat agregasi.

Tidak menampilkan detail isi invoice tenant.

---

# TENANT MANAGEMENT

Platform Super Admin dapat:

* Membuat Tenant Baru
* Mengubah Tenant
* Menonaktifkan Tenant
* Mengaktifkan Tenant
* Menghapus Tenant
* Melihat Detail Tenant

Field Tenant:

* Nama Tenant
* Jenis Tenant
* Nama Perusahaan/Lembaga
* Logo
* Email
* Nomor Telepon
* Alamat
* NPWP (opsional)
* Status
* Tanggal Aktivasi

Jenis Tenant:

* Perusahaan
* Pelatihan
* Sekolah
* Organisasi
* Lainnya

---

# PEMBUATAN TENANT

Saat membuat tenant baru, sistem otomatis membuat:

Tenant Super Admin

Field:

* Nama Lengkap
* Email
* Password
* Jabatan

Role otomatis:

Tenant Super Admin

Status:

Aktif

---

# PLATFORM AUDIT TRAIL

Catat aktivitas:

* Membuat Tenant
* Mengubah Tenant
* Menonaktifkan Tenant
* Mengaktifkan Tenant
* Menghapus Tenant
* Reset Password Tenant Super Admin

Audit hanya dapat diakses Platform Super Admin.

---

# TENANT SUPER ADMIN

Setiap tenant memiliki role tertinggi sendiri.

Role:

Tenant Super Admin

Dapat mengakses:

* Dashboard
* Pelanggan
* Invoice
* Kwitansi
* Surat Menyurat
* Arsip
* Pengaturan

Dapat mengelola pengguna tenant.

Tidak dapat mengakses Platform.

---

# MULTI-TENANT DATA ISOLATION

Seluruh data operasional harus terisolasi berdasarkan tenant.

Data yang wajib dipisahkan:

* Users
* Customers
* Invoices
* Invoice Items
* Receipts
* Documents
* Templates
* Audit Logs
* Settings
* Archives

Tambahkan tenant_id pada seluruh tabel operasional.

Pengguna hanya dapat melihat data milik tenantnya sendiri.

Tidak boleh ada kebocoran data antar tenant.

---

# LOGIN

Seluruh pengguna login melalui halaman yang sama.

Contoh:

doctiva.id/login

Form Login:

* Email
* Password
* Remember Me
* Forgot Password

Tidak ada fitur registrasi mandiri.

---

# PROSES LOGIN

Setelah login berhasil:

Sistem menentukan:

1. Role pengguna
2. Tenant pengguna

Jika role adalah Platform Super Admin:

Arahkan ke Dashboard Platform.

Jika role adalah Tenant:

Arahkan ke Dashboard Tenant masing-masing.

---

# IDENTITAS TENANT

Pertahankan tampilan DocTiva yang sudah ada.

Tambahkan identitas tenant.

Tampilkan pada header:

* Logo Tenant
* Nama Tenant
* Nama Pengguna
* Jabatan

Logo dan nama tenant berubah otomatis sesuai akun yang login.

---

# PENGALAMAN PENGGUNA TENANT

Pengguna tenant tetap melihat tampilan yang sama seperti sebelumnya.

Menu tetap:

Dashboard

Pelanggan

Invoice

Kwitansi

Surat Menyurat

Arsip

Pengaturan

Tidak ada perubahan besar pada desain.

Tidak ada redesign UI.

Workflow tetap sama.

---

# DUKUNGAN UNTUK PELATIHAN

Tenant jenis Pelatihan dapat digunakan untuk:

* Batch Pelatihan
* Simulasi
* Ujian
* Workshop

Data peserta tidak bercampur dengan tenant lain.

Pengguna pelatihan dapat menggunakan seluruh fitur sesuai role yang diberikan.

---

# DATABASE BARU

Tambahkan tabel:

platform_users

tenants

tenant_types

tenant_subscriptions

platform_audit_logs

Perbarui seluruh tabel operasional dengan field:

tenant_id

---

# KEAMANAN

Pastikan:

* Tenant tidak dapat mengakses data tenant lain.
* Platform Super Admin tidak dapat melihat isi detail dokumen tenant secara langsung.
* Password disimpan menggunakan hash yang aman.
* Session terisolasi.
* Audit Trail aktif.

---

# ACCEPTANCE CRITERIA

Fitur dianggap selesai apabila:

* DocTiva berubah menjadi platform multi-tenant.
* Platform Super Admin tersedia.
* Platform Super Admin tidak memiliki fitur operasional seperti Invoice atau Kwitansi.
* Platform Super Admin dapat mengelola tenant.
* Tenant otomatis memiliki Tenant Super Admin.
* Seluruh tenant memiliki data terisolasi.
* Pengguna tetap login melalui halaman yang sama.
* Dashboard tenant tetap seperti sebelumnya.
* Desain dan pengalaman pengguna tidak berubah.
* Logo dan nama tenant tampil otomatis sesuai tenant yang login.
* Seluruh fitur operasional tetap berjalan normal.
* Sistem dapat digunakan secara bersamaan oleh banyak perusahaan maupun pelatihan tanpa pencampuran data.
