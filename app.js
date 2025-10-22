const majorCities = [
    { name: 'Токио', country: 'Япония', timezone: 'Asia/Tokyo', coords: { lat: 35.6762, lon: 139.6503 } },
    { name: 'Дели', country: 'Индия', timezone: 'Asia/Kolkata', coords: { lat: 28.6139, lon: 77.2090 } },
    { name: 'Шанхай', country: 'Китай', timezone: 'Asia/Shanghai', coords: { lat: 31.2304, lon: 121.4737 } },
    { name: 'Сан-Паулу', country: 'Бразилия', timezone: 'America/Sao_Paulo', coords: { lat: -23.5505, lon: -46.6333 } },
    { name: 'Мехико', country: 'Мексика', timezone: 'America/Mexico_City', coords: { lat: 19.4326, lon: -99.1332 } },
    { name: 'Каир', country: 'Египет', timezone: 'Africa/Cairo', coords: { lat: 30.0444, lon: 31.2357 } },
    { name: 'Москва', country: 'Россия', timezone: 'Europe/Moscow', coords: { lat: 55.7558, lon: 37.6173 } },
    { name: 'Лондон', country: 'Великобритания', timezone: 'Europe/London', coords: { lat: 51.5074, lon: -0.1278 } },
    { name: 'Нью-Йорк', country: 'США', timezone: 'America/New_York', coords: { lat: 40.7128, lon: -74.0060 } },
    { name: 'Лос-Анджелес', country: 'США', timezone: 'America/Los_Angeles', coords: { lat: 34.0522, lon: -118.2437 } },
    { name: 'Сидней', country: 'Австралия', timezone: 'Australia/Sydney', coords: { lat: -33.8688, lon: 151.2093 } },
    { name: 'Дубай', country: 'ОАЭ', timezone: 'Asia/Dubai', coords: { lat: 25.2048, lon: 55.2708 } }
];

// Функция для получения погоды через Open-Meteo API
async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();
    const resultDiv = document.getElementById('weatherResult');
    const errorDiv = document.getElementById('errorMessage');
    const loadingDiv = document.getElementById('loadingSpinner');
    const searchBtn = document.getElementById('searchBtn');

    // Скрываем предыдущие результаты
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    // Проверяем ввод
    if (!city) {
        showError('Пожалуйста, введите название города');
        return;
    }

    // Блокируем кнопку и показываем спиннер
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Загрузка...';
    loadingDiv.style.display = 'block';

    try {
        // Получаем координаты города
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru`);
        
        if (!geoResponse.ok) {
            throw new Error('Ошибка при поиске города');
        }

        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('Город не найден');
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        
        // Получаем погоду по координатам
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m&timezone=auto`);
        
        if (!weatherResponse.ok) {
            throw new Error('Ошибка при получении данных о погоде');
        }

        const weatherData = await weatherResponse.json();
        const current = weatherData.current;

        // Форматируем данные для отображения
        const formattedData = {
            city: name,
            country: country,
            temperature: Math.round(current.temperature_2m),
            feels_like: Math.round(current.apparent_temperature),
            description: getWeatherDescription(current.temperature_2m),
            humidity: current.relative_humidity_2m,
            pressure: Math.round(current.surface_pressure),
            wind: current.wind_speed_10m,
            icon: getWeatherIcon(current.temperature_2m)
        };

        // Отображаем данные о погоде
        displayWeather(formattedData);
        
    } catch (error) {
        showError(error.message);
    } finally {
        // Разблокируем кнопку и скрываем спиннер
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="bi bi-search me-2"></i>Найти';
        loadingDiv.style.display = 'none';
    }
}

// Функция для определения описания погоды по температуре
function getWeatherDescription(temp) {
    if (temp < -10) return 'сильный мороз';
    if (temp < 0) return 'мороз';
    if (temp < 10) return 'прохладно';
    if (temp < 20) return 'облачно';
    if (temp < 30) return 'тепло';
    return 'жарко';
}

// Функция для определения иконки погоды по температуре
function getWeatherIcon(temp) {
    if (temp < 0) return '❄️';
    if (temp < 10) return '🌧️';
    if (temp < 20) return '☁️';
    if (temp < 30) return '⛅';
    return '☀️';
}

// Функция для отображения данных о погоде
function displayWeather(data) {
    const resultDiv = document.getElementById('weatherResult');
    
    const weatherHTML = `
        <div class="weather-card bg-blue-50 rounded-2xl p-6 mb-4">
            <!-- Заголовок с городом -->
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">
                    ${data.city}, ${data.country}
                </h2>
                <div class="text-4xl">${data.icon}</div>
            </div>

            <!-- Основная температура -->
            <div class="text-center mb-4">
                <div class="text-5xl font-bold text-blue-600 mb-2">
                    ${data.temperature}°C
                </div>
                <p class="text-gray-600 capitalize">${data.description}</p>
                <p class="text-sm text-gray-500">
                    Ощущается как ${data.feels_like}°C
                </p>
            </div>

            <!-- Дополнительная информация -->
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="flex items-center text-gray-600">
                    <i class="bi bi-droplet me-2 text-blue-400"></i>
                    <span>Влажность: ${data.humidity}%</span>
                </div>
                <div class="flex items-center text-gray-600">
                    <i class="bi bi-speedometer2 me-2 text-green-400"></i>
                    <span>Давление: ${data.pressure} hPa</span>
                </div>
                <div class="flex items-center text-gray-600">
                    <i class="bi bi-wind me-2 text-gray-400"></i>
                    <span>Ветер: ${data.wind} м/с</span>
                </div>
                <div class="flex items-center text-gray-600">
                    <i class="bi bi-thermometer me-2 text-red-400"></i>
                    <span>Чувствуется: ${data.feels_like}°C</span>
                </div>
            </div>
        </div>

        <button class="btn btn-outline-primary w-100" onclick="clearSearch()">
            <i class="bi bi-arrow-repeat me-2"></i>
            Новый поиск
        </button>
    `;

    resultDiv.innerHTML = weatherHTML;
    resultDiv.style.display = 'block';
}

// Функция для отображения ошибок
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        ${message}
    `;
    errorDiv.style.display = 'block';
}

// Функция очистки поиска
function clearSearch() {
    document.getElementById('cityInput').value = '';
    document.getElementById('weatherResult').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('cityInput').focus();
}

// Обработка нажатия Enter
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        getWeather();
    }
}

// Фокусировка на поле ввода при загрузке
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('cityInput').focus();

});
