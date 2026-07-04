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

    let targetUrl = '';
    if (id) {
        // ОФИЦИАЛЬНЫЙ КАНOНИЧНЫЙ ПУТЬ ДЕТАЛЕЙ И СЕРИЙ АНИМЕ В API V1 (БЕЗ RELEASES И CATALOG)
        targetUrl = `https://aniliberty.top/api/v1/anime/${id}`;
    } else if (query) {
        // ОФИЦИАЛЬНЫЙ КАНOНИЧНЫЙ ПУТЬ ПОИСКА АНИМЕ В API V1 (БЕЗ CATALOG)
        targetUrl =`https://aniliberty.top/api/v1/anime/releases/${id}/episodes`;
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
        console.log(`Запрос к каноничному API v1: ${targetUrl}`);
        
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
