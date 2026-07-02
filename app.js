// Элементы страницы
const player = document.getElementById('nonax-player');
const skipBtn = document.getElementById('nonax-skip-btn');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

const resultsDropdown = document.getElementById('results-dropdown');
const resultsGrid = document.getElementById('results-grid');

const animePoster = document.getElementById('anime-poster');
const animeTitleDisplay = document.getElementById('anime-title-display');
const episodeSubtitleDisplay = document.getElementById('episode-subtitle-display');
const episodesContainer = document.getElementById('episode-list-container');
const animeDescription = document.getElementById('anime-description');

// Состояние приложения
let currentAnimeData = null;
let currentEpisodeKey = null;
let hlsInstance = null;

// Поиск по клику и по нажатию Enter
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Функция поиска через AllOrigins JSON-контейнер (не блокируется Cloudflare)
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    // Выводим лоадер
    resultsGrid.innerHTML = '<p style="grid-column: span 4; color: var(--nx-text-secondary); text-align: center;">Поиск аниме в базе...</p>';
    resultsDropdown.style.display = 'block';

    // Живой и рабочий API v3 сервер приложения
    const searchUrl = `https://api.anilibria.app/v3/title/search?search=${encodeURIComponent(query)}`;
    
    // Запрос идет через метод /get (JSON container) — AllOrigins запрашивает его со своего бэкенда, обходя Turnstile и капчи
    const primaryProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;

    try {
        console.log("Отправляем защищенный контейнерный запрос...");
        const response = await fetch(primaryProxyUrl);
        if (!response.ok) throw new Error("Контейнер AllOrigins отклонил запрос.");
        
        const wrapper = await response.json();
        
        // Безопасно распаковываем текстовый ответ в полноценный JSON
        const data = JSON.parse(wrapper.contents);
        const list = Array.isArray(data) ? data : (data.list || []);
        
        if (list && list.length >= 0) {
            displaySearchResults(list);
            return; // Успешно вышли из функции
        }
    } catch (err) {
        console.warn("Основной контейнер дал сбой, пробуем резервные прокси...", err);
    }

    // Наш резервный прокси на случай перегрузки основного
    const backupProxyUrl = `https://api.cors.lol/?url=${encodeURIComponent(searchUrl)}`;

    try {
        console.log("Запрос через резервный прокси...");
        const response = await fetch(backupProxyUrl);
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.list || []);
        
        if (list) {
            displaySearchResults(list);
        }
    } catch (fallbackErr) {
        console.error("Оба способа заблокированы:", fallbackErr);
        resultsGrid.innerHTML = '<p style="grid-column: span 4; color: var(--nx-accent-red); text-align: center;">Не удалось связаться с серверами Анилибрии. Попробуйте ввести запрос еще раз.</p>';
    }
}

// Вывод результатов поиска
function displaySearchResults(animeList) {
    resultsGrid.innerHTML = '';
    if (animeList.length === 0) {
        resultsGrid.innerHTML = '<p style="grid-column: span 4; color: var(--nx-text-secondary); text-align: center;">Ничего не найдено.</p>';
        resultsDropdown.style.display = 'block';
        return;
    }

    animeList.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'nx-anime-card';
        
        // Находим правильный URL постера
        let posterPath = anime.posters && anime.posters.medium ? anime.posters.medium.url : '';
        const posterUrl = posterPath.startsWith('http') ? posterPath : `https://anilibria.top${posterPath}`;

        card.innerHTML = `
            <img src="${posterUrl}" alt="${anime.names.ru}">
            <div class="nx-anime-card-title">${anime.names.ru}</div>
        `;

        card.addEventListener('click', () => {
            loadAnime(anime);
            resultsDropdown.style.display = 'none';
        });

        resultsGrid.appendChild(card);
    });

    resultsDropdown.style.display = 'block';
    resultsDropdown.scrollIntoView({ behavior: 'smooth' });
}

// Загрузка аниме и его данных
function loadAnime(anime) {
    currentAnimeData = anime;
    animeTitleDisplay.innerText = anime.names.ru;
    animeDescription.innerText = anime.description || "Описание временно отсутствует.";
    
    let posterPath = anime.posters && anime.posters.medium ? anime.posters.medium.url : '';
    animePoster.src = posterPath.startsWith('http') ? posterPath : `https://anilibria.top${posterPath}`;

    // Генерация списка серий
    episodesContainer.innerHTML = '';
    
    if (!anime.player || !anime.player.list) {
        episodesContainer.innerHTML = '<p style="color: var(--nx-text-secondary);">У этого релиза пока нет серий в плеере.</p>';
        return;
    }

    const episodeKeys = Object.keys(anime.player.list);

    episodeKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'nx-episode-btn';
        btn.innerText = key;
        btn.addEventListener('click', () => loadEpisode(key));
        episodesContainer.appendChild(btn);
    });

    if (episodeKeys.length > 0) {
        loadEpisode(episodeKeys[0]);
    }
}

// Запуск серии
function loadEpisode(episodeKey) {
    currentEpisodeKey = episodeKey;
    const episode = currentAnimeData.player.list[episodeKey];
    const videoHost = currentAnimeData.player.host || "cache.libria.fun";

    document.querySelectorAll('.nx-episode-btn').forEach(btn => {
        if (btn.innerText === episodeKey) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    episodeSubtitleDisplay.innerText = `Серия ${episodeKey} • ${episode.name || 'Эпизод воспроизводится'}`;

    const hlsPath = episode.hls.fhd || episode.hls.hd || episode.hls.sd;
    if (!hlsPath) {
        alert("Не найден рабочий видеопоток для данной серии.");
        return;
    }

    const finalVideoUrl = hlsPath.startsWith('http') ? hlsPath : `https://${videoHost}${hlsPath}`;
    playHlsStream(finalVideoUrl);
}

// Старт HLS.js
function playHlsStream(url) {
    if (hlsInstance) {
        hlsInstance.destroy();
    }

    if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(player);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            player.play().catch(() => console.log("Браузер ожидает клика пользователя."));
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
        player.addEventListener('loadedmetadata', () => {
            player.play().catch(() => console.log("Браузер ожидает клика пользователя."));
        });
    }

    skipBtn.style.display = 'none';
}

// Слежение за таймкодами опенингов
player.addEventListener('timeupdate', () => {
    if (!currentAnimeData || !currentEpisodeKey) return;

    const time = player.currentTime;
    const episode = currentAnimeData.player.list[currentEpisodeKey];

    if (episode.skips && episode.skips.opening && episode.skips.opening.length === 2) {
        const start = episode.skips.opening[0];
        const end = episode.skips.opening[1];

        if (time >= start && time < end) {
            skipBtn.style.display = 'block';
            skipBtn.onclick = () => {
                player.currentTime = end;
                skipBtn.style.display = 'none';
            };
        } else {
            skipBtn.style.display = 'none';
        }
    } else {
        skipBtn.style.display = 'none';
    }
});
