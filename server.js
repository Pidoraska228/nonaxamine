const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем CORS, чтобы ваш сайт на GitHub Pages мог беспрепятственно делать запросы к этому серверу
app.use(cors());

// Эндпоинт для поиска аниме
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Поисковый запрос пуст' });
    }

    // Официальный рабочий домен API Анилибрии
    const targetUrl = `https://api.anilibria.tv/v3/title/search?search=${encodeURIComponent(query)}`;

    try {
        console.log(`Сервер делает запрос к Анилибрии для поиска: "${query}"`);
        
        // Сервер делает запрос напрямую — здесь Cloudflare пропускает его без CORS-блокировок!
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`Ошибка Анилибрии: ${response.status}`);
        }

        const data = await response.json();
        
        // Отправляем чистый полученный JSON-ответ обратно нашему фронтенду
        res.json(data);
    } catch (error) {
        console.error('Ошибка на сервере:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при поиске аниме', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер Nonaxamine успешно запущен на порту ${PORT}`);
});
