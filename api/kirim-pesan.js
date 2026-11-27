// Panel admin: kirim pengumuman / popup ke game.
// POST /api/kirim-pesan  body: { password, nama?, nominal?, pesan, sumber? }
// Password diambil dari Environment Variable ADMIN_PASSWORD (JANGAN ditulis di kode).
const crypto = require("crypto");
const { publishToRoblox } = require("../lib/bridge");

const TOPIC = "PengumumanCash";

function samePassword(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ sukses: false, error: "Gunakan POST" });
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ sukses: false, error: "ADMIN_PASSWORD belum diisi di Vercel" });
  }

  let b = req.body || {};
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch { b = {}; }
  }
  if (!samePassword(b.password, expected)) {
    return res.status(401).json({ sukses: false, error: "Password salah!" });
  }

  const pesan = String(b.pesan || "").trim().slice(0, 200);
  const nama = String(b.nama || "").trim().slice(0, 50);
  const nominal = Math.floor(Number(b.nominal) || 0);
  const sumber = b.sumber === "sociabuzz" ? "sociabuzz" : "saweria";
  if (!pesan && !nominal) {
    return res.status(400).json({ sukses: false, error: "Isi pesan atau nominal." });
  }

  // Ada nama/nominal -> JSON (popup donasi + Live board). Hanya pesan -> teks (popup "Pengumuman").
  const data = (nama || nominal > 0)
    ? { id: "panel-" + Date.now(), name: nama || "Pengumuman", amount: nominal, message: pesan, source: sumber }
    : pesan;

  try {
    await publishToRoblox(data, TOPIC);
    res.status(200).json({ sukses: true });
  } catch (err) {
    console.error("[kirim-pesan]", err.message);
    res.status(500).json({ sukses: false, error: err.message });
  }
};
