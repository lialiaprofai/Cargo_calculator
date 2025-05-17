// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;
tg.expand();

// URL таблицы Google
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQp2Bm2X0WNNGOssLIJHmbcIdPTwHbUoKFjaFojx8XPKFrvEG5LI0AuG2BNhMaCu-e2CAMC0YWeJgKn/pub?gid=0&single=true&output=csv';

// Кэш для хранения данных таблицы
let priceData = null;

// Загрузка данных из таблицы
async function loadPriceData() {
    try {
        const response = await fetch(SPREADSHEET_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
        
        // Преобразование данных в удобный формат
        priceData = rows.slice(1).map(row => ({
            category: row[0],
            deliveryMethod: row[1],
            density: row[2],
            price: parseFloat(row[3])
        }));
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных. Пожалуйста, попробуйте позже.');
    }
}

// Расчет стоимости доставки
async function calculatePrice() {
    if (!priceData) {
        await loadPriceData();
    }

    const category = document.getElementById('category').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const volume = parseFloat(document.getElementById('volume').value);

    if (!category || isNaN(weight) || isNaN(volume)) {
        showError('Пожалуйста, заполните все поля корректно');
        return;
    }

    const density = weight / volume;
    const resultDiv = document.getElementById('result');

    // Поиск подходящей цены в зависимости от плотности
    const priceInfo = priceData.find(item => 
        item.category === category && 
        isInDensityRange(density, item.density)
    );

    if (!priceInfo) {
        showError('Не удалось найти подходящую цену для указанных параметров');
        return;
    }

    let totalPrice;
    if (priceInfo.price === 450) {
        // Если цена указана за кубометр
        totalPrice = volume * priceInfo.price;
    } else {
        // Если цена указана за килограмм
        totalPrice = weight * priceInfo.price;
    }

    showResult(`Стоимость доставки: ${totalPrice.toFixed(2)} $`);
    
    // Отправляем данные в Telegram
    tg.sendData(JSON.stringify({
        category: category,
        weight: weight,
        volume: volume,
        density: density,
        price: totalPrice
    }));
}

// Проверка, попадает ли плотность в указанный диапазон
function isInDensityRange(density, rangeStr) {
    if (rangeStr === '100以下') return density < 100;
    if (rangeStr === '400以上') return density > 400;
    
    const [min, max] = rangeStr.split('-').map(Number);
    return density >= min && density <= max;
}

// Показать результат
function showResult(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.classList.add('show');
    resultDiv.style.color = 'var(--tg-theme-text-color, #000000)';
}

// Показать ошибку
function showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.classList.add('show');
    resultDiv.style.color = 'var(--tg-theme-destructive-text-color, #ff3b30)';
}

// Загрузка данных при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadPriceData();
    
    // Настройка темы Telegram
    document.body.style.backgroundColor = tg.themeParams.bg_color;
    document.body.style.color = tg.themeParams.text_color;
});
