// 👇👇👇 ¡PEGA AQUÍ TU ID DE GOOGLE SHEETS! 👇👇👇
const SHEET_ID = 'TU_CODIGO_LARGO_AQUI'; 
// 👆👆👆 (Ejemplo: 1BxiMMrD...)

let menuData = [];
let shoppingData = [];
let breakfastData = [];
let currentWeek = 1;

document.addEventListener('DOMContentLoaded', async () => {
    if(SHEET_ID === 'TU_CODIGO_LARGO_AQUI') {
        alert("¡Ojo! No has puesto el ID de tu Google Sheet en el archivo script.js");
        return;
    }
    
    await loadData();
    
    // Listeners
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

async function loadData() {
    try {
        document.getElementById('current-week-label').textContent = "Sincronizando...";
        
        // 1. Cargar Menú
        const menuRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menu`);
        menuData = await menuRes.json();

        // 2. Cargar Compra
        const shopRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`);
        shoppingData = await shopRes.json();

        // 3. Cargar Desayunos
        const breakRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Desayunos`);
        breakfastData = await breakRes.json();

        // Renderizar todo
        renderWeek(currentWeek);
        renderShopping(currentWeek);
        renderBreakfasts();

    } catch (error) {
        console.error(error);
        document.getElementById('current-week-label').textContent = "Error";
        alert('Error cargando datos. Revisa el ID y que la hoja esté "Publicada en la web".');
    }
}

function changeWeek(direction) {
    let newWeek = currentWeek + direction;
    // Comprobamos si esa semana existe en los datos
    const hasData = menuData.some(row => row.semana == newWeek);
    
    if (hasData) {
        currentWeek = newWeek;
        renderWeek(currentWeek);
        renderShopping(currentWeek);
    }
}

function renderWeek(weekNum) {
    document.getElementById('current-week-label').textContent = `Semana ${weekNum}`;
    const container = document.getElementById('days-container');
    container.innerHTML = '';

    const weekDays = menuData.filter(row => row.semana == weekNum);

    weekDays.forEach(day => {
        const isCheat = day.tipo && day.tipo.toLowerCase().includes('cheat');
        const html = `
            <div class="day-item">
                <div class="day-header ${isCheat ? 'cheat-day' : ''}">
                    <span>${day.dia}</span>
                    ${isCheat ? '<i class="fas fa-star"></i>' : ''}
                </div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${day.comida}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${day.cena}</div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function renderShopping(weekNum) {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    
    const items = shoppingData.filter(row => row.semana == weekNum);
    
    if(items.length === 0) list.innerHTML = '<li>Sin datos de compra para esta semana</li>';

    items.forEach(obj => {
        list.innerHTML += `<li><input type="checkbox"> ${obj.item}</li>`;
    });
}

function renderBreakfasts() {
    const list = document.getElementById('breakfast-list');
    list.innerHTML = '';
    breakfastData.forEach(row => {
        list.innerHTML += `<li><strong>${row.opcion}:</strong> ${row.descripcion}</li>`;
    });
}

window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName + '-view').classList.add('active');
    
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'menu') btns[0].classList.add('active');
    else btns[1].classList.add('active');
};
