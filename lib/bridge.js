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

const LEADERBOARD_STORE = process.env.LEADERBOARD_STORE || "DonateCashLeaderboard_V1";

function robloxConfig() {
  const apiKey = process.env.ROBLOX_API_KEY || process.env.kaii_key;
  const universeId = process.env.UNIVERSE_ID || "10355628793";
  if (!apiKey) {
    throw new Error("ROBLOX_API_KEY belum diisi di Environment Variables Vercel");
  }
  return { apiKey, universeId };
}

// Sama dengan sanitizeKey() di DonateCashServer (Roblox) supaya key leaderboard cocok.
function leaderboardKey(name) {
  const key = String(name || "").replace(/[^A-Za-z0-9_ \-]/g, "").slice(0, 50);
  return key || "Anonim";
}

// Tambah total donasi langsung ke OrderedDataStore leaderboard lewat Open Cloud.
// Tetap tersimpan walaupun tidak ada server game yang sedang online.
async function addToLeaderboard(name, amount) {
  const { apiKey, universeId } = robloxConfig();
  const entry = encodeURIComponent(leaderboardKey(name));
  const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}/ordered-data-stores/${LEADERBOARD_STORE}/scopes/global/entries/${entry}:increment`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.floor(amount) }),
  });
  if (!res.ok) {
    throw new Error(`Leaderboard API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Kirim pesan ke semua server game lewat Open Cloud Messaging.
// `data` boleh object (dikirim sebagai JSON) atau string (dikirim apa adanya).
async function publishToRoblox(data, topic = TOPIC) {
  const { apiKey, universeId } = robloxConfig();
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

    // 1. Simpan ke leaderboard dulu (tidak butuh server game online)
    donation.stored = false;
    if (donation.amount > 0) {
      try {
        const entry = await addToLeaderboard(donation.name, donation.amount);
        donation.stored = true;
        console.log(`[${source}] leaderboard: ${leaderboardKey(donation.name)} = ${entry && entry.value}`);
      } catch (err) {
        // Game akan menyimpan sendiri kalau ada server online (fallback)
        console.error(`[${source}] gagal simpan leaderboard:`, err.message);
      }
    }

    // 2. Beri tahu server game (popup, efek, Live board, refresh leaderboard)
    try {
      await publishToRoblox(donation);
    } catch (err) {
      console.error(`[${source}] gagal kirim ke Roblox:`, err.message);
      if (!donation.stored) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    }
    res.status(200).json({ ok: true, stored: donation.stored });
  };
}

module.exports = { normalize, publishToRoblox, addToLeaderboard, leaderboardKey, checkToken, makeWebhookHandler };
