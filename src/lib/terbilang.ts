const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function angka(n: number): string {
  n = Math.floor(n);
  if (n < 12) return SATUAN[n];
  if (n < 20) return angka(n - 10) + " belas";
  if (n < 100) return angka(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + angka(n % 10) : "");
  if (n < 200) return "seratus" + (n - 100 ? " " + angka(n - 100) : "");
  if (n < 1000) return angka(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + angka(n % 100) : "");
  if (n < 2000) return "seribu" + (n - 1000 ? " " + angka(n - 1000) : "");
  if (n < 1_000_000) return angka(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + angka(n % 1000) : "");
  if (n < 1_000_000_000) return angka(Math.floor(n / 1_000_000)) + " juta" + (n % 1_000_000 ? " " + angka(n % 1_000_000) : "");
  if (n < 1_000_000_000_000) return angka(Math.floor(n / 1_000_000_000)) + " miliar" + (n % 1_000_000_000 ? " " + angka(n % 1_000_000_000) : "");
  return angka(Math.floor(n / 1_000_000_000_000)) + " triliun" + (n % 1_000_000_000_000 ? " " + angka(n % 1_000_000_000_000) : "");
}

export function terbilang(n: number): string {
  if (!isFinite(n)) return "";
  const neg = n < 0;
  n = Math.abs(Math.round(n));
  const w = (n === 0 ? "nol" : angka(n)) + " rupiah";
  return (neg ? "minus " : "") + w.replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}