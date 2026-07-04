const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем CORS
app.use(cors());

// Вспомогательная функция для запросов
function fetchUrl(url, res, options) {
    https.get(url, options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                return res.status(200).json(parsedData);
            } catch (parseError) {
                return res.status(500).json({ error: 'Ошибка парсинга ответа от API v1', details: parseError.message });
            }
        });
    }).on("error", (err) => {
        return res.status(500).json({ error: 'Ошибка сети при обращении к API v1', details: err.message });
    });
}

// Поисковый эндпоинт
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const id = req.query.id;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    // Настраиваем карусель серверов Анилибрии на случай падения или тех. работ
    let urlsToTry = [];
    if (id) {
        urlsToTry = [
            `https://aniliberty.top/api/v1/anime/releases/${id}/episodes`,
            `https://api.anilibria.top/v3/title?id=${id}`,
            `https://api-anilibria.ru/v3/title?id=${id}`
        ];
    } else if (query) {
        urlsToTry = [
            `https://aniliberty.top/api/v1/anime/search?q=${encodeURIComponent(query)}`,
            `https://api.anilibria.top/v3/title/search?search=${encodeURIComponent(query)}`,
            `https://api-anilibria.ru/v3/title/search?search=${encodeURIComponent(query)}`
        ];
    } else {
        return res.status(400).json({ error: 'Параметры q или id отсутствуют' });
    }

    let success = false;
    let lastError = null;

    // Перебираем серверы по очереди
    for (let i = 0; i < urlsToTry.length; i++) {
        const targetUrl = urlsToTry[i];
        console.log(`Сервер пробует зеркало ${i + 1}: ${targetUrl}`);
        
        try {
            const data = await new Promise((resolve, reject) => {
                https.get(targetUrl, options, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP Status ${response.statusCode}`));
                        return;
                    }
                    let body = '';
                    response.on('data', (chunk) => body += chunk);
                    response.on('end', () => resolve(body));
                }).on("error", (err) => reject(err));
            });

            const parsed = JSON.parse(data);
            
            if (parsed.error && parsed.error.code >= 400) {
                throw new Error(`API Error: ${parsed.error.message}`);
            }

            res.status(200).json(parsed);
            success = true;
            break;
        } catch (err) {
            console.warn(`Зеркало ${i + 1} (${new URL(targetUrl).hostname}) дало сбой:`, err.message);
            lastError = err;
        }
    }

    if (!success) {
        res.status(500).json({ 
            error: 'Все серверы Анилибрии недоступны или перегружены', 
            details: lastError ? lastError.message : 'Неизвестная ошибка' 
        });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер успешно запущен на порту ${PORT}`);
});
