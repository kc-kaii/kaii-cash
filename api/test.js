// Kirim donasi PALSU ke game untuk mengetes (tidak masuk leaderboard).
// POST https://NAMA-PROJECT.vercel.app/api/test?token=TOKEN_RAHASIA
// Body JSON opsional: { "name": "Budi", "amount": 25000, "message": "Semangat!" }
const { normalize, publishToRoblox, checkToken } = require("../lib/bridge");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("Endpoint tes aktif. Kirim POST ke URL ini.");
  }
  if (!checkToken(req, res)) return;

  const b = req.body || {};
  const donation = normalize("test", {
    id: "test-" + Date.now(),
    donator_name: b.name || "Tester",
    amount_raw: b.amount || 10000,
    message: b.message || "Ini donasi percobaan!",
  });
  try {
    await publishToRoblox(donation);
    res.status(200).json({ ok: true, donation });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
