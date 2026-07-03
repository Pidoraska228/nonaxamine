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
    if (!query) {
        return res.status(400).json({ error: 'Поисковый запрос пуст' });
    }

    const targetUrl = `https://api.anilibria.tv/v3/title/search?search=${encodeURIComponent(query)}`;

    // Безопасный запрос через встроенный модуль https (совместимый со всеми версиями Node.js)
    try {
        https.get(targetUrl, (response) => {
            let data = '';

            // Собираем кусочки данных
            response.on('data', (chunk) => {
                data += chunk;
            });

            // Когда все данные получены
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    return res.status(200).json(parsedData);
                } catch (parseError) {
                    return res.status(500).json({ error: 'Ошибка парсинга ответа от Анилибрии', details: parseError.message });
                }
            });

        }).on("error", (err) => {
            return res.status(500).json({ error: 'Ошибка сетевого запроса к Анилибрии', details: err.message });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Критическая ошибка сервера', details: error.message });
    }
};
