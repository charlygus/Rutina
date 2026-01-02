// 👇 TU ID ESTÁ AQUÍ (NO LO TOQUES)
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
        
        // 1. Cargar MENÚ (Ahora buscamos la pestaña 'Platos')
        const menuRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Platos`);
        if (!menuRes.ok) throw new Error("No encuentro la pestaña 'Platos'");
        menuData = await menuRes.json();
        
        // Comprobación de que hay datos
        if (menuData.error) throw new Error(menuData.error);

        // 2. Cargar COMPRA
        const shopRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`);
        if (!shopRes.ok) throw new Error("No encuentro la pestaña 'Compra'");
        shoppingData = await shopRes.json();

        // 3. Cargar DESAYUNOS
        const breakRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Desayunos`);
        breakfastData = await breakRes.json(); // Si falla Desayunos no es crítico, pero avisará

        // SI LLEGAMOS AQUÍ, TODO ESTÁ BIEN
        renderWeek(currentWeek);
        renderShopping(currentWeek);
        renderBreakfasts();

    } catch (error) {
        console.error(error);
        label.textContent = "Error ❌";
        
        // Muestra el error en la pantalla del móvil para que lo leas
        container.innerHTML = `
            <div style="background:#ffebee; color:#c62828; padding:20px; border-radius:10px; text-align:center;">
                <h3>¡Ups! Algo falla</h3>
                <p><strong>El error es:</strong> ${error.message}</p>
                <hr style="border:0; border-top:1px solid #e57373; margin:10px 0;">
                <p style="font-size:0.9em">
                    1. ¿Has renombrado la pestaña del Excel a <b>Platos</b>?<br>
                    2. ¿Has esperado 1 minuto tras el cambio?<br>
                    3. Verifica la Fila 1: <i>semana, dia, comida...</i>
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
        // Leemos las columnas aunque tengan mayúsculas por error
        const comida = day.comida || day.Comida || "Falta columna 'comida'";
        const cena = day.cena || day.Cena || "Falta columna 'cena'";
        const dia = day.dia || day.Dia || day.Día || "Día?";
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
        const prod = obj.producto || obj.item || obj.Producto || "Sin nombre";
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
