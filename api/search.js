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

    // НОВЫЙ РАБОЧИЙ ЭНДПОИНТ API v1 Анилибрии на домене anilibria.top
    const targetUrl = `https://anilibria.top/api/v1/anime/releases?search=${encodeURIComponent(query)}`;

    try {
        console.log(`Запрос к новому API v1 для: "${query}"`);
        
        https.get(targetUrl, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

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
    } catch (error) {
        return res.status(500).json({ error: 'Критическая ошибка сервера', details: error.message });
    }
};
