require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Ganti dengan Universe ID game Roblox Anda
const UNIVERSE_ID = '10355628793';

app.get('/', (req, res) => {
  res.send('Server kaii-cash siap mengirim pesan ke Roblox!');
});

// Endpoint untuk mengirim pesan ke Roblox Messaging Service
app.post('/kirim-pesan', async (req, res) => {
  const { topik, pesan } = req.body;

  if (!topik || !pesan) {
    return res.status(400).json({ error: 'Harap sertakan topik dan pesan.' });
  }

  try {
    const url = `https://roblox.com{UNIVERSE_ID}:publishMessage`;
    
    await axios.post(
      url,
      {
        topic: topik,
        message: typeof pesan === 'string' ? pesan : JSON.stringify(pesan)
      },
      {
        headers: {
          'x-api-key': process.env.kaii_key,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({ sukses: true, info: 'Pesan berhasil dikirim ke server game!' });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({ 
      sukses: false, 
      error: error.response ? error.response.data : 'Gagal mengirim pesan' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
