// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;
tg.expand();

// URL таблицы Google (основная)
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQp2Bm2X0WNNGOssLIJHmbcIdPTwHbUoKFjaFojx8XPKFrvEG5LI0AuG2BNhMaCu-e2CAMC0YWeJgKn/pub?gid=0&single=true&output=csv';
// URL delivery time
const DELIVERY_TIME_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQp2Bm2X0WNNGOssLIJHmbcIdPTwHbUoKFjaFojx8XPKFrvEG5LI0AuG2BNhMaCu-e2CAMC0YWeJgKn/pub?gid=442095192&single=true&output=csv';

// Кэш для хранения данных таблицы
let priceData = null;
let deliveryTimes = [];
let fastDays = '';
let slowDays = '';

// Категории 百货
const baihuoCategories = [
    "Аксессуары",
    "Автозапчасти",
    "Бижутерия",
    "Бирки",
    "Галантерея (сумки, перчатки, галстуки)",
    "Запчасти для оборудования",
    "Игрушки",
    "Инструменты для маникюра",
    "Канцелярские товары",
    "Кисти для макияжа",
    "Носки",
    "Рождественские товары",
    "Солнцезащитные очки",
    "Спортивные товары",
    "Товары для питомцев (клетки, поводки, ошейники)",
    "Упаковочные пакеты",
    "Футляры для очков"
];

// Загрузка данных из таблицы
async function loadPriceData() {
    try {
        const response = await fetch(SPREADSHEET_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
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

// Загрузка сроков доставки
async function loadDeliveryTimes() {
    try {
        const response = await fetch(DELIVERY_TIME_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
        deliveryTimes = rows.slice(1).map(row => ({
            category: row[0].trim(),
            deliveryMethod: row[2].trim(),
            days: row[3].trim()
        }));
    } catch (error) {
        console.error('Ошибка загрузки сроков доставки:', error);
    }
}

// Расчет стоимости доставки
async function calculatePrice() {
    if (!priceData) {
        await loadPriceData();
    }

    let category = document.getElementById('category').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const volume = parseFloat(document.getElementById('volume').value);
    let deliveryMethod = null;
    const fastRadio = document.getElementById('delivery-fast');
    const slowRadio = document.getElementById('delivery-slow');
    if (fastRadio && fastRadio.checked) deliveryMethod = fastRadio.value;
    if (slowRadio && slowRadio.checked) deliveryMethod = slowRadio.value;

    if (!category || isNaN(weight) || isNaN(volume)) {
        showError('Пожалуйста, заполните все поля корректно');
        return;
    }

    // Логика подстановки категории для поиска в таблице
    if (baihuoCategories.includes(category)) {
        category = "百货";
    } else if (category === "Одежда") {
        category = "服装";
    } else if (category === "Обувь") {
        category = "鞋";
    } else if (category === "Мебель") {
        category = "家具";
    } else if (
        category === "Бытовая техника" ||
        category === "Телевизоры" ||
        category === "Электротехника (радиоприёмники, микрофоны, проекторы)"
    ) {
        category = "家电";
    }

    const density = weight / volume;
    const resultDiv = document.getElementById('result');

    // Поиск подходящей цены в зависимости от плотности и способа доставки
    const priceInfo = priceData.find(item => 
        item.category === category && 
        (!deliveryMethod || item.deliveryMethod === deliveryMethod) &&
        isInDensityRange(density, item.density)
    );

    if (!priceInfo) {
        showError('Не удалось найти подходящую цену для указанных параметров');
        return;
    }

    let totalPrice;
    if (priceInfo.price === 450) {
        totalPrice = volume * priceInfo.price;
    } else {
        totalPrice = weight * priceInfo.price;
    }

    showResult(`Стоимость доставки: ${totalPrice.toFixed(2)} $`);
    tg.sendData(JSON.stringify({
        category: category,
        weight: weight,
        volume: volume,
        density: density,
        price: totalPrice
    }));
}

function isInDensityRange(density, rangeStr) {
    if (rangeStr === '100以下') return density < 100;
    if (rangeStr === '400以上') return density > 400;
    const [min, max] = rangeStr.split('-').map(Number);
    return density >= min && density <= max;
}

function showResult(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.classList.add('show');
    resultDiv.style.color = 'var(--tg-theme-text-color, #000000)';
}

function showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.classList.add('show');
    resultDiv.style.color = 'var(--tg-theme-destructive-text-color, #ff3b30)';
}

// Динамическое отображение способов доставки и сроков
function updateDeliveryBlock() {
    const category = document.getElementById('category').value;
    const deliveryBlock = document.getElementById('delivery-method-block');
    const deliveryTimeDiv = document.getElementById('delivery-time');
    const radioGroup = document.querySelector('.radio-group');
    if (!category) {
        deliveryBlock.style.display = 'none';
        deliveryTimeDiv.textContent = '';
        radioGroup.style.display = '';
        return;
    }
    let searchCategory = category;
    if (baihuoCategories.includes(category)) searchCategory = "百货";
    else if (category === "Одежда") searchCategory = "服装";
    else if (category === "Обувь") searchCategory = "鞋";
    else if (category === "Мебель") searchCategory = "家具";
    else if (
        category === "Бытовая техника" ||
        category === "Телевизоры" ||
        category === "Электротехника (радиоприёмники, микрофоны, проекторы)"
    ) searchCategory = "家电";
    const options = deliveryTimes.filter(dt => dt.category === searchCategory);
    if (options.length === 2) {
        deliveryBlock.style.display = '';
        radioGroup.style.display = '';
        const fast = options.find(o=>o.deliveryMethod.includes('быстрый') || o.deliveryMethod.includes('特快'));
        const slow = options.find(o=>o.deliveryMethod.includes('обычный') || o.deliveryMethod.includes('普快'));
        fastDays = fast.days;
        slowDays = slow.days;
        document.getElementById('delivery-fast-text').textContent = `Быстрый`;
        document.getElementById('delivery-slow-text').textContent = `Обычный`;
        updateDeliveryTime();
        document.getElementById('delivery-fast').onclick = updateDeliveryTime;
        document.getElementById('delivery-slow').onclick = updateDeliveryTime;
    } else if (options.length === 1) {
        deliveryBlock.style.display = '';
        radioGroup.style.display = 'none';
        fastDays = '';
        slowDays = '';
        deliveryTimeDiv.textContent = `Доставка: ${options[0].days}`;
    } else {
        deliveryBlock.style.display = 'none';
        deliveryTimeDiv.textContent = '';
        radioGroup.style.display = '';
    }
}

function updateDeliveryTime() {
    const deliveryTimeDiv = document.getElementById('delivery-time');
    if (document.getElementById('delivery-fast').checked) {
        deliveryTimeDiv.textContent = `Срок доставки: ${fastDays}`;
    } else if (document.getElementById('delivery-slow').checked) {
        deliveryTimeDiv.textContent = `Срок доставки: ${slowDays}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadPriceData();
    loadDeliveryTimes();
    document.getElementById('category').addEventListener('change', updateDeliveryBlock);
    document.body.style.backgroundColor = tg.themeParams.bg_color;
    document.body.style.color = tg.themeParams.text_color;
});
