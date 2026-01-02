// 👇 TU ID (No lo toques si ya es el correcto) 👇
const SHEET_ID = '1jMrd9A3Pvs-r606i8H6NYp6RAw-46rE5tlGfXUL0QK4';

let menuData = [];
let shoppingData = [];
let breakfastData = [];
let currentWeek = 1;

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

async function loadData() {
    try {
        const label = document.getElementById('current-week-label');
        label.textContent = "Cargando...";
        
        // 1. Cargar Menú (Apunta a 'Menu' sin tilde)
        const menuRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menu`);
        if (!menuRes.ok) throw new Error("Fallo al cargar la pestaña Menu");
        menuData = await menuRes.json();

        // 2. Cargar Compra
        const shopRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`);
        if (!shopRes.ok) throw new Error("Fallo al cargar la pestaña Compra");
        shoppingData = await shopRes.json();

        // 3. Cargar Desayunos
        const breakRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Desayunos`);
        breakfastData = await breakRes.json();

        // Renderizar
        renderWeek(currentWeek);
        renderShopping(currentWeek);
        renderBreakfasts();

    } catch (error) {
        console.error(error);
        alert(`❌ ERROR: ${error.message}\n\nAsegúrate de:\n1. Que la pestaña se llame "Menu" (sin tilde).\n2. Que la Fila 1 sea: semana, dia, comida, cena, tipo (en minúsculas).`);
    }
}

function changeWeek(direction) {
    let newWeek = currentWeek + direction;
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

    if (weekDays.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">⚠️ No hay datos.<br>Revisa que la columna "semana" en el Excel tenga el número correcto.</div>';
        return;
    }

    weekDays.forEach(day => {
        // Diagnóstico: Si sale "undefined", es que el título en Excel tiene mayúsculas
        if(!day.comida && !day.Comida) {
            container.innerHTML = `<div style="padding:10px; color:red;">ERROR DE DATOS:<br>No encuentro la columna 'comida'.<br>En tu Excel, la Fila 1 debe decir 'comida' (en minúsculas).</div>`;
            return;
        }

        // Truco: Leemos 'comida' O 'Comida' por si acaso se te escapó una mayúscula
        const comidaText = day.comida || day.Comida;
        const cenaText = day.cena || day.Cena;
        const diaText = day.dia || day.Dia || day.Día;
        
        const isCheat = (day.tipo && day.tipo.toLowerCase().includes('cheat'));
        
        const html = `
            <div class="day-item">
                <div class="day-header ${isCheat ? 'cheat-day' : ''}">
                    <span>${diaText}</span>
                    ${isCheat ? '<i class="fas fa-star"></i>' : ''}
                </div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${comidaText}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${cenaText}</div>
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
    
    if(items.length === 0) list.innerHTML = '<li>Sin datos de compra</li>';

    items.forEach(obj => {
        // Leemos 'producto' O 'item' O 'Producto'
        const prod = obj.producto || obj.item || obj.Producto;
        list.innerHTML += `<li><input type="checkbox"> ${prod}</li>`;
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
