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

    // Рабочий эндпоинт API v1 Анилибрии на домене aniliberty.top
    const targetUrl = `https://aniliberty.top/api/v1/anime/releases?search=${encodeURIComponent(query)}`;
    
    // Используем контейнер AllOrigins на бэкенде Vercel для полного обхода блокировок IP Amazon/Vercel
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        console.log(`Сервер запускает двойной обход через AllOrigins для: "${query}"`);
        
        https.get(proxyUrl, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const wrapper = JSON.parse(data);
                    if (!wrapper.contents) {
                        return res.status(500).json({ error: 'Прокси вернул пустой контейнер' });
                    }
                    
                    // Распаковываем ответ базы из контейнера AllOrigins
                    const parsedData = JSON.parse(wrapper.contents);
                    return res.status(200).json(parsedData);
                } catch (parseError) {
                    return res.status(500).json({ 
                        error: 'Ошибка парсинга ответа от API v1', 
                        details: parseError.message,
                        rawData: data.substring(0, 300)
                    });
                }
            });

        }).on("error", (err) => {
            return res.status(500).json({ error: 'Ошибка сети при обращении к прокси', details: err.message });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Критическая ошибка сервера', details: error.message });
    }
};
