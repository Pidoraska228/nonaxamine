const https = require('https');

// Вспомогательная функция для отправки запроса
function fetchUrl(url, res, options) {
    https.get(url, options, (response) => {
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
}

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    if (id) {
        // Пробуем два возможных адреса Анилибрии для получения деталей релиза
        const url1 = `https://aniliberty.top/api/v1/anime/releases/${id}`;
        const url2 = `https://aniliberty.top/api/v1/anime/catalog/releases/${id}`;
        
        console.log(`Пробуем получить серии по пути 1: ${url1}`);
        
        https.get(url1, options, (response) => {
            // Если первый путь выдал 404 (Не найдено) — переключаемся на второй путь!
            if (response.statusCode === 404) {
                console.log(`Путь 1 вернул 404. Переключаемся на путь 2: ${url2}`);
                fetchUrl(url2, res, options);
            } else {
                // Если путь 1 сработал — отдаем его ответ
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => {
                    try {
                        const parsedData = JSON.parse(data);
                        return res.status(200).json(parsedData);
                    } catch (e) {
                        fetchUrl(url2, res, options); // резервный переход в случае ошибки парсинга
                    }
                });
            }
        }).on("error", () => {
            fetchUrl(url2, res, options);
        });
        
    } else if (query) {
        // Эндпоинт для поиска аниме в API v1
        const searchUrl = `https://aniliberty.top/api/v1/anime/catalog/releases?search=${encodeURIComponent(query)}`;
        fetchUrl(searchUrl, res, options);
    } else {
        return res.status(400).json({ error: 'Параметры q или id отсутствуют' });
    }
};
