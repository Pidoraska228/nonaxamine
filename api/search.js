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

    // ОФИЦИАЛЬНОЕ ЗЕРКАЛО БЕЗ CLOUDFLARE ДЛЯ РФ И СНГ
    const targetUrl = `https://api.api-anilibria.ru/v3/title/search?search=${encodeURIComponent(query)}`;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        console.log(`Запрос к официальному зеркалу Анилибрии без Cloudflare для: "${query}"`);
        
        https.get(targetUrl, options, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    return res.status(200).json(parsedData);
                } catch (parseError) {
                    return res.status(500).json({ 
                        error: 'Ошибка парсинга ответа от зеркала', 
                        details: parseError.message,
                        rawData: data.substring(0, 300)
                    });
                }
            });

        }).on("error", (err) => {
            return res.status(500).json({ error: 'Ошибка сети при обращении к зеркалу', details: err.message });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Критическая ошибка сервера', details: error.message });
    }
};
