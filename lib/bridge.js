// Logika bersama: verifikasi token, normalisasi data donasi, kirim ke Roblox.
const TOPIC = process.env.TOPIC || "Donation";

function pick(obj, keys, fallback) {
  for (const k of keys) {
    const v = k.split(".").reduce((o, p) => (o == null ? undefined : o[p]), obj);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function normalize(source, body) {
  return {
    source,
    id: String(pick(body, ["id", "transaction_id", "order_id", "invoice_id"], Date.now())),
    name: String(pick(body, ["donator_name", "supporter_name", "supporter", "name", "donor_name"], "Anonim")).slice(0, 50),
    amount: Number(pick(body, ["amount_raw", "amount", "etc.amount_to_display", "total", "price"], 0)) || 0,
    message: String(pick(body, ["message", "supporter_message", "note", "content"], "")).slice(0, 200),
  };
}

// Kirim pesan ke semua server game lewat Open Cloud Messaging.
// `data` boleh object (dikirim sebagai JSON) atau string (dikirim apa adanya).
async function publishToRoblox(data, topic = TOPIC) {
  const apiKey = process.env.ROBLOX_API_KEY || process.env.kaii_key;
  const universeId = process.env.UNIVERSE_ID || "10355628793";
  if (!apiKey) {
    throw new Error("ROBLOX_API_KEY belum diisi di Environment Variables Vercel");
  }
  const message = typeof data === "string" ? data : JSON.stringify(data);
  const res = await fetch(`https://apis.roblox.com/cloud/v2/universes/${universeId}:publishMessage`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ topic, message }),
  });
  if (!res.ok) {
    throw new Error(`Roblox API ${res.status}: ${await res.text()}`);
  }
}

function checkToken(req, res) {
  const expected = process.env.WEBHOOK_TOKEN;
  if (!expected) {
    res.status(500).json({ ok: false, error: "WEBHOOK_TOKEN belum diisi" });
    return false;
  }
  if (req.query.token !== expected) {
    res.status(401).json({ ok: false, error: "token salah" });
    return false;
  }
  return true;
}

// Membuat handler Vercel untuk satu platform (saweria / sociabuzz)
function makeWebhookHandler(source) {
  return async (req, res) => {
    if (req.method !== "POST") {
      return res.status(200).send(`Webhook ${source} aktif. Kirim POST ke URL ini.`);
    }
    if (!checkToken(req, res)) return;

    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    console.log(`[${source}] payload mentah:`, JSON.stringify(body));

    const donation = normalize(source, body);
    console.log(`[${source}] dinormalisasi:`, donation);

    try {
      await publishToRoblox(donation);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error(`[${source}] gagal kirim ke Roblox:`, err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  };
}

module.exports = { normalize, publishToRoblox, checkToken, makeWebhookHandler };
