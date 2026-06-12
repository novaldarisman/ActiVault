# GENERAL PROMPT – DOC GENERATOR ENGINE (SURAT MENYURAT DOCTIVA)

Tambahkan modul baru pada DocTiva bernama:

# Surat Menyurat (Document Generator)

Posisi menu:

Dashboard
Pelanggan
Invoice
Kwitansi
Surat Menyurat
Arsip
Pengaturan

Tujuan modul ini adalah menjadi pusat pembuatan seluruh dokumen administrasi perusahaan dengan sistem template yang fleksibel.

Modul harus dirancang agar dapat terus berkembang tanpa perlu mengubah struktur utama aplikasi.

---

# KONSEP UTAMA

Document Generator adalah mesin pembuat dokumen berbasis template.

Satu mesin dapat digunakan untuk membuat berbagai jenis surat.

Pengguna cukup memilih jenis dokumen dan template yang sesuai.

---

# JENIS DOKUMEN BAWAAN

Sediakan jenis dokumen berikut:

1. Memorandum of Understanding (MOU)
2. Surat Perjanjian Kerja Sama (SPK)
3. Surat Penawaran
4. Surat Tugas
5. Surat Pernyataan
6. Surat Kuasa
7. Non Disclosure Agreement (NDA)
8. Kontrak Pelatihan
9. Perjanjian Konsultan
10. Creative Agreement

Jenis dokumen bersifat dinamis.

Super Admin dapat:

* Menambah jenis dokumen baru
* Mengubah nama jenis dokumen
* Menonaktifkan jenis dokumen
* Menghapus jenis dokumen yang belum digunakan

---

# HALAMAN DAFTAR DOKUMEN

Tampilkan:

* Nomor Dokumen
* Judul Dokumen
* Jenis Dokumen
* Pelanggan/Mitra
* Tanggal Dokumen
* Status
* Pembuat

Fitur:

* Search
* Filter Jenis Dokumen
* Filter Status
* Filter Tanggal
* Sorting
* Pagination

---

# PENOMORAN OTOMATIS

Setiap jenis dokumen memiliki format nomor sendiri.

Contoh:

MOU-YYYYMM-XXXX

SPK-YYYYMM-XXXX

PEN-YYYYMM-XXXX

TUG-YYYYMM-XXXX

NDA-YYYYMM-XXXX

Pengguna dapat mengubah format melalui Pengaturan.

Nomor harus unik.

---

# PEMBUATAN DOKUMEN

Buat halaman "Buat Dokumen".

Konsep pembuatan harus semudah Invoice.

Tahapan:

1. Pilih Jenis Dokumen
2. Pilih Template
3. Isi Informasi Dasar
4. Isi Konten Dokumen
5. Preview
6. Simpan atau Download PDF

---

# INFORMASI DASAR

Field:

* Nomor Dokumen
* Judul Dokumen
* Jenis Dokumen
* Tanggal Dokumen
* Tanggal Berlaku
* Tanggal Berakhir (opsional)
* Status

Status:

* Draft
* Aktif
* Selesai
* Berakhir
* Dibatalkan

---

# PIHAK TERKAIT

Integrasikan dengan Master Pelanggan.

Field:

* Pilih Pelanggan
* Nama Perusahaan
* PIC
* Alamat
* Email
* Nomor Telepon

Jika pelanggan belum ada:

Pengguna dapat membuat pelanggan baru langsung dari halaman dokumen.

---

# TEMPLATE ENGINE

Bangun sistem template yang fleksibel.

Pengguna dapat:

* Membuat template baru
* Menyimpan template
* Mengedit template
* Menyalin template
* Menonaktifkan template
* Menghapus template

Template tidak hardcoded.

Template dibuat oleh pengguna.

---

# EDITOR KONTEN

Sediakan editor modern.

Mendukung:

* Heading
* Bold
* Italic
* Underline
* Bullet List
* Numbered List
* Tabel
* Alignment
* Page Break

Pengguna dapat menyusun isi dokumen sesuai kebutuhan.

---

# PLACEHOLDER DINAMIS

Template dapat menggunakan placeholder.

Contoh:

{{nomor_dokumen}}

{{tanggal_dokumen}}

{{nama_perusahaan}}

{{alamat_perusahaan}}

{{nama_pelanggan}}

{{nama_pic}}

{{jabatan_pic}}

{{tanggal_mulai}}

{{tanggal_berakhir}}

Saat dokumen dibuat, placeholder otomatis diganti dengan data sebenarnya.

---

# TEMPLATE KHUSUS PER JENIS DOKUMEN

MOU:
Menggunakan template MOU.

SPK:
Menggunakan template SPK.

Surat Penawaran:
Menggunakan template penawaran.

NDA:
Menggunakan template NDA.

Dan seterusnya.

Pengguna bebas menentukan isi template.

---

# PDF GENERATOR

Seluruh dokumen dapat:

* Preview
* Download PDF

PDF harus:

* Format A4
* Siap cetak
* Menggunakan identitas perusahaan
* Menampilkan nomor dokumen
* Menampilkan isi lengkap
* Mendukung page break
* Mendukung tabel
* Mendukung tanda tangan

Template PDF mengikuti template pilihan pengguna.

---

# TANDA TANGAN

Sediakan blok tanda tangan.

PIHAK PERTAMA

Nama:
Jabatan:

PIHAK KEDUA

Nama:
Jabatan:

Mendukung:

* Tanda tangan digital
* Stempel digital

---

# ARSIP INTERNAL

Seluruh dokumen tersimpan otomatis.

Metadata:

* Nomor Dokumen
* Jenis Dokumen
* Pelanggan
* Status
* Pembuat
* Lokasi PDF
* Tanggal Dibuat

Struktur arsip:

documents/
├─ mou/
├─ spk/
├─ penawaran/
├─ nda/
├─ surat_tugas/
├─ surat_kuasa/
└─ lainnya/

---

# AUDIT TRAIL

Catat aktivitas:

* Membuat dokumen
* Edit dokumen
* Hapus dokumen
* Download PDF
* Membuat template
* Mengubah template
* Menghapus template
* Mengubah status

Simpan:

* Pengguna
* Jabatan
* Aktivitas
* Tanggal
* Waktu

---

# DATABASE YANG DIPERLUKAN

document_types

documents

document_templates

document_template_versions

document_signatories

document_audit_logs

document_status_histories

Relasi:

Satu pelanggan dapat memiliki banyak dokumen.

Satu jenis dokumen memiliki banyak template.

Satu template dapat digunakan banyak dokumen.

Satu dokumen dapat memiliki banyak versi template.

---

# ACCEPTANCE CRITERIA

Fitur dianggap selesai apabila:

* Menu Surat Menyurat tersedia di bawah Kwitansi.
* Seluruh jenis dokumen bawaan tersedia.
* Jenis dokumen dapat dikelola secara dinamis.
* Template dapat dibuat sendiri oleh pengguna.
* Dokumen dapat dibuat semudah Invoice.
* Placeholder bekerja otomatis.
* Dokumen dapat dipreview dan diunduh menjadi PDF.
* Seluruh dokumen terarsip otomatis.
* Audit Trail mencatat seluruh aktivitas.
* Tidak terdapat placeholder page atau dummy feature.
