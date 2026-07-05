const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const id = req.query.id;

    let targetUrl = '';
    if (id) {
        // КОРРЕКТНОЕ ЗЕРКАЛО С ДВОЙНОЙ ПРИСТАВКОЙ (ЭТО НЕ ОПЕЧАТКА!)
        targetUrl = `https://api.api-anilibria.ru/v3/title?id=${id}`;
    } else if (query) {
        // КОРРЕКТНОЕ ЗЕРКАЛО С ДВОЙНОЙ ПРИСТАВКОЙ (ЭТО НЕ ОПЕЧАТКА!)
        targetUrl = `https://api.api-anilibria.ru/v3/title/search?search=${encodeURIComponent(query)}`;
    } else {
        return res.status(400).json({ error: 'Параметры q или id отсутствуют' });
    }

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        https.get(targetUrl, options, (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    return res.status(200).json(parsedData);
                } catch (parseError) {
                    return res.status(500).json({ error: 'Ошибка парсинга ответа от зеркала', details: parseError.message });
                }
            });
        }).on("error", (err) => {
            return res.status(500).json({ error: 'Ошибка сети при обращении к зеркалу', details: err.message });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Критическая ошибка сервера', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
