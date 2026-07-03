export default async function handler(req, res) {
    // Включаем CORS-заголовки, чтобы ваш фронтенд на GitHub Pages мог делать сюда запросы
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Если это предзапрос CORS (браузер проверяет доступность)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Получаем поисковое слово из параметров (?q=наруто)
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Поисковый запрос пуст' });
    }

    // Официальный рабочий домен API Анилибрии
    const targetUrl = `https://api.anilibria.tv/v3/title/search?search=${encodeURIComponent(query)}`;

    try {
        console.log(`Serverless-сервер делает запрос к Анилибрии для: "${query}"`);
        
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`Анилибрия ответила со статусом: ${response.status}`);
        }

        const data = await response.json();
        
        // Отправляем чистый ответ обратно нашему сайту
        return res.status(200).json(data);
    } catch (error) {
        console.error('Ошибка на сервере:', error);
        return res.status(500).json({ 
            error: 'Ошибка сервера при поиске аниме', 
            details: error.message 
        });
    }
}
