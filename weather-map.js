let weatherMap;
let mapMarkers = [];
let currentPopup = null;

// Инициализация карты
function initWeatherMap() {
    // Создаем карту с центром в мире
    weatherMap = L.map('weatherMap').setView([20, 0], 2);

    // Добавляем слой OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(weatherMap);

    // Добавляем обработчик клика по карте
    weatherMap.on('click', function(e) {
        getWeatherForCoordinates(e.latlng.lat, e.latlng.lng);
    });

    // Загружаем основные города на карту
    addMajorCitiesToMap();

    console.log('Карта погоды инициализирована');
}

// Добавление крупных городов на карту
function addMajorCitiesToMap() {
    // Очищаем предыдущие маркеры
    clearMapMarkers();

    // Сначала получаем погоду для всех городов
    Promise.all(majorCities.map(async (city) => {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.coords.lat}&longitude=${city.coords.lon}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
            
            if (!response.ok) {
                throw new Error('Ошибка получения данных');
            }
            
            const data = await response.json();
            const current = data.current;
            
            return {
                ...city,
                temperature: Math.round(current.temperature_2m),
                humidity: current.relative_humidity_2m,
                localTime: getLocalTime(city.timezone)
            };
        } catch (error) {
            console.error(`Ошибка загрузки погоды для ${city.name}:`, error);
            return {
                ...city,
                temperature: '--',
                humidity: '--',
                localTime: getLocalTime(city.timezone)
            };
        }
    })).then(citiesWithWeather => {
        // После получения всех данных добавляем маркеры на карту
        citiesWithWeather.forEach(city => {
            const icon = L.divIcon({
                className: 'weather-marker',
                html: `
                    <div class="weather-marker-content ${getTemperatureClass(city.temperature)}">
                        <div class="temperature">${city.temperature}°</div>
                        <div class="city-name">${city.name}</div>
                    </div>
                `,
                iconSize: [60, 40],
                iconAnchor: [30, 40]
            });

            const marker = L.marker([city.coords.lat, city.coords.lon], { icon: icon })
                .addTo(weatherMap)
                .bindPopup(`
                    <div class="text-center">
                        <h6 class="fw-bold">${city.name}, ${city.country}</h6>
                        <div class="temperature-large ${getTemperatureClass(city.temperature)}">
                            ${city.temperature}°C
                        </div>
                        <div class="small text-muted">
                            <i class="bi bi-droplet"></i> Влажность: ${city.humidity}%<br>
                            <i class="bi bi-clock"></i> Время: ${city.localTime}
                        </div>
                    </div>
                `);

            mapMarkers.push(marker);
        });
    });
}

// Получение погоды по координатам (при клике на карту)
async function getWeatherForCoordinates(lat, lon) {
    try {
        // Показываем временный маркер
        const tempMarker = L.marker([lat, lon])
            .addTo(weatherMap)
            .bindPopup('<div class="text-center"><div class="spinner-border spinner-border-sm"></div><br>Загрузка...</div>')
            .openPopup();

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`);
        
        if (!response.ok) {
            throw new Error('Ошибка получения данных о погоде');
        }

        const data = await response.json();
        const current = data.current;

        // Получаем название местности
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ru`);
        let locationName = 'Неизвестное место';
        
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.results && geoData.results.length > 0) {
                locationName = geoData.results[0].name;
            }
        }

        // Обновляем popup с данными
        tempMarker.setPopupContent(`
            <div class="text-center">
                <h6 class="fw-bold">${locationName}</h6>
                <div class="temperature-large ${getTemperatureClass(current.temperature_2m)}">
                    ${Math.round(current.temperature_2m)}°C
                </div>
                <div class="small text-muted">
                    <i class="bi bi-droplet"></i> Влажность: ${current.relative_humidity_2m}%<br>
                    <i class="bi bi-cloud"></i> ${getWeatherDescriptionByCode(current.weather_code)}
                </div>
            </div>
        `);

        // Сохраняем текущий popup
        currentPopup = tempMarker;

    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        if (currentPopup) {
            currentPopup.setPopupContent(`
                <div class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i><br>
                    Ошибка загрузки данных
                </div>
            `);
        }
    }
}

// Поиск на карте
async function searchOnMap() {
    const query = document.getElementById('mapSearch').value.trim();
    
    if (!query) {
        alert('Введите название города для поиска');
        return;
    }

    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ru`);
        
        if (!response.ok) {
            throw new Error('Ошибка поиска');
        }

        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            alert('Город не найден');
            return;
        }

        const { latitude, longitude, name, country } = data.results[0];
        
        // Перемещаем карту к найденному городу
        weatherMap.setView([latitude, longitude], 10);
        
        // Получаем погоду для этого города
        getWeatherForCoordinates(latitude, longitude);

    } catch (error) {
        console.error('Ошибка поиска:', error);
        alert('Ошибка при поиске города');
    }
}

// Обработка нажатия Enter в поле поиска карты
function handleMapSearchKeyPress(event) {
    if (event.key === 'Enter') {
        searchOnMap();
    }
}

// Вспомогательные функции
function getTemperatureClass(temp) {
    if (temp === '--') return 'temp-unknown';
    if (temp < 0) return 'temp-cold';
    if (temp < 10) return 'temp-cool';
    if (temp < 20) return 'temp-mild';
    if (temp < 30) return 'temp-warm';
    return 'temp-hot';
}

function getWeatherDescriptionByCode(weatherCode) {
    const weatherDescriptions = {
        0: 'Ясно',
        1: 'Преимущественно ясно',
        2: 'Переменная облачность',
        3: 'Пасмурно',
        45: 'Туман',
        48: 'Туман с инеем',
        51: 'Морось',
        53: 'Умеренная морось',
        55: 'Сильная морось',
        61: 'Небольшой дождь',
        63: 'Умеренный дождь',
        65: 'Сильный дождь',
        80: 'Ливень',
        81: 'Сильный ливень',
        82: 'Очень сильный ливень'
    };
    
    return weatherDescriptions[weatherCode] || 'Неизвестно';
}

function clearMapMarkers() {
    mapMarkers.forEach(marker => {
        weatherMap.removeLayer(marker);
    });
    mapMarkers = [];
}

// Инициализация карты при загрузке вкладки
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик для кнопки поиска на карте
    document.getElementById('mapSearchBtn').addEventListener('click', searchOnMap);

    const mapTab = document.getElementById('map-tab');
    mapTab.addEventListener('click', function() {
        if (!window.mapInitialized) {
            setTimeout(() => {
                initWeatherMap();
                window.mapInitialized = true;
            }, 100);
        }
    });
});
