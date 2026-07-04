const https = require('https');

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const query = req.query.q;
    const id = req.query.id;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, flee Gecko) Chrome/120.0.0.0 Safari/537.36',
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
            
            // Если ответ содержит ошибку от Cloudflare (например, 522 или 502)
            if (parsed.error && parsed.error.code >= 400) {
                throw new Error(`API Error: ${parsed.error.message}`);
            }

            // УСПЕХ! Отдаем ответ клиенту
            res.status(200).json(parsed);
            success = true;
            break; // выходим из цикла
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
};
