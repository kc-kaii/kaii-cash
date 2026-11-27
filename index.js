require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Ganti dengan Universe ID game Roblox Anda
const UNIVERSE_ID = '10355628793';
// Password rahasia agar orang asing tidak sembarangan mengirim pesan lewat web/API
const PASSWORD_ADMIN = 'Drams2107'; 

// 1. Tampilan Website (Buka langsung di browser)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Panel Roblox - Kaii Cash</title>
      <style>
        body { font-family: sans-serif; background: #121212; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1e1e1e; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        h2 { margin-top: 0; text-align: center; color: #4ade80; }
        input, textarea, button { width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #333; background: #2a2a2a; color: #fff; box-sizing: border-box; }
        button { background: #22c55e; color: #000; font-weight: bold; border: none; cursor: pointer; margin-top: 12px; }
        button:hover { background: #16a34a; }
        #status { margin-top: 12px; text-align: center; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Kirim Pesan ke Roblox</h2>
        <input type="password" id="password" placeholder="Password Admin" required>
        <input type="text" id="topik" value="PengumumanCash" placeholder="Topik (contoh: PengumumanCash)" required>
        <textarea id="pesan" rows="3" placeholder="Tulis pesan atau jumlah cash..." required></textarea>
        <button onclick="kirimData()">Kirim ke Server Game</button>
        <div id="status"></div>
      </div>

      <script>
        async function kirimData() {
          const status = document.getElementById('status');
          status.innerText = 'Mengirim...';
          
          const res = await fetch('/kirim-pesan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              password: document.getElementById('password').value,
              topik: document.getElementById('topik').value,
              pesan: document.getElementById('pesan').value
            })
          });

          const data = await res.json();
          if (data.sukses) {
            status.style.color = '#4ade80';
            status.innerText = 'Berhasil terkirim ke Roblox!';
            document.getElementById('pesan').value = '';
          } else {
            status.style.color = '#f87171';
            status.innerText = 'Gagal: ' + (data.error || 'Terjadi kesalahan');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// 2. Jalur API (Dipakai oleh Website dan Bot Discord)
app.post('/kirim-pesan', async (req, res) => {
  const { password, topik, pesan } = req.body;

  if (password !== PASSWORD_ADMIN) {
    return res.status(401).json({ sukses: false, error: 'Password salah!' });
  }

  if (!topik || !pesan) {
    return res.status(400).json({ sukses: false, error: 'Topik dan pesan wajib diisi.' });
  }

  try {
    const url = `https://roblox.com{UNIVERSE_ID}/topics/${topik}`;
    
    await axios.post(
      url,
      { message: typeof pesan === 'string' ? pesan : JSON.stringify(pesan) },
      {
        headers: {
          'x-api-key': process.env.kaii_key,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({ sukses: true });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({ 
      sukses: false,
      error: error.response ? JSON.stringify(error.response.data) : 'Gagal menghubungi Roblox' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(Server berjalan di port ${PORT}));
