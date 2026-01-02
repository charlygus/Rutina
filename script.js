// 👇 TU ID (CONFIRMADO QUE ES ESTE)
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
    const label = document.getElementById('current-week-label');
    const container = document.getElementById('days-container');
    
    try {
        label.textContent = "Cargando...";

        // 1. Cargar MENU
        const menuRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menu`);
        if (!menuRes.ok) throw new Error("Error cargando la pestaña 'Menu'");
        menuData = await menuRes.json();
        
        // Si devuelve error interno de la hoja
        if (menuData.error) throw new Error("La hoja 'Menu' no existe o tiene el nombre mal escrito (cuidado con los espacios).");

        // 2. Cargar COMPRA
        const shopRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`);
        shoppingData = await shopRes.json();

        // 3. Cargar DESAYUNOS
        const breakRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Desayunos`);
        breakfastData = await breakRes.json();

        // Renderizar
        renderWeek(currentWeek);
        renderShopping(currentWeek);
        renderBreakfasts();

    } catch (error) {
        console.error(error);
        label.textContent = "Error";
        container.innerHTML = `
            <div style="padding:20px; text-align:center; color:red;">
                <h3>⚠️ Error de conexión</h3>
                <p>${error.message}</p>
                <p style="font-size:0.8em; color:black;">
                    Intenta esto:<br>
                    1. En Google Sheets, ve a <b>Archivo > Compartir > Publicar en la web</b>.<br>
                    2. Dale a <b>Detener</b> y luego a <b>Iniciar</b> otra vez.
                </p>
            </div>
        `;
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
        container.innerHTML = '<div style="text-align:center; padding:20px;">No hay datos para la Semana ' + weekNum + '</div>';
        return;
    }

    weekDays.forEach(day => {
        // Leemos las columnas intentando corregir mayúsculas automáticamente
        const comida = day.comida || day.Comida || "Revisar columna 'comida'";
        const cena = day.cena || day.Cena || "Revisar columna 'cena'";
        const dia = day.dia || day.Dia || day.Día || "";
        const isCheat = day.tipo && day.tipo.toLowerCase().includes('cheat');
        
        const html = `
            <div class="day-item">
                <div class="day-header ${isCheat ? 'cheat-day' : ''}">
                    <span>${dia}</span>
                    ${isCheat ? '<i class="fas fa-star"></i>' : ''}
                </div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${comida}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${cena}</div>
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
        const prod = obj.producto || obj.item || "Producto sin nombre";
        list.innerHTML += `<li><input type="checkbox"> ${prod}</li>`;
    });
}

function renderBreakfasts() {
    const list = document.getElementById('breakfast-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(!breakfastData || breakfastData.length === 0) {
        list.innerHTML = '<li>Cargando...</li>';
        return;
    }
    
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
