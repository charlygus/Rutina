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
        label.textContent = "Sincronizando...";

        // 1. Intentamos cargar MENU
        const menuRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menu`);
        menuData = await menuRes.json();
        
        // Si hay error, lanzamos el diagnóstico
        if (menuData.error || !Array.isArray(menuData)) {
            throw new Error("Pestaña 'Menu' no encontrada.");
        }

        // 2. Cargar COMPRA y DESAYUNOS (esto ya sabemos que funciona)
        const [shopRes, breakRes] = await Promise.all([
            fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`),
            fetch(`https://opensheet.elk.sh/${SHEET_ID}/Desayunos`)
        ]);
        
        shoppingData = await shopRes.json();
        breakfastData = await breakRes.json();

        renderWeek(currentWeek);
        renderShopping(currentWeek);
        renderBreakfasts();

    } catch (error) {
        console.error(error);
        label.textContent = "Error";
        container.innerHTML = `
            <div style="padding:20px; text-align:center; background:#fff3e0; border-radius:10px;">
                <h3 style="color:#e67e22;">⚠️ Diagnóstico de Hoja</h3>
                <p>La pestaña <b>Menu</b> no responde. Revisa esto:</p>
                <ul style="text-align:left; display:inline-block;">
                    <li>¿La pestaña se llama <b>Menu</b> (exacto)?</li>
                    <li>¿Hay datos escritos en ella?</li>
                </ul>
                <p style="font-size:0.8em; margin-top:10px;">Prueba este link en tu móvil:<br>
                <a href="https://opensheet.elk.sh/${SHEET_ID}/Menu" target="_blank">Ver datos reales de Google</a></p>
            </div>
        `;
    }
}

function changeWeek(direction) {
    let newWeek = currentWeek + direction;
    if (menuData.some(row => row.semana == newWeek)) {
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
        const comida = day.comida || day.Comida || "---";
        const cena = day.cena || day.Cena || "---";
        const dia = day.dia || day.Dia || day.Día || "";
        const isCheat = day.tipo && day.tipo.toLowerCase().includes('cheat');
        
        container.innerHTML += `
            <div class="day-item">
                <div class="day-header ${isCheat ? 'cheat-day' : ''}">
                    <span>${dia}</span>
                    ${isCheat ? '<i class="fas fa-star"></i>' : ''}
                </div>
                <div class="day-body">
                    <div class="meal-row"><span class="meal-label">Comida</span><div class="meal-text">${comida}</div></div>
                    <div class="meal-row"><span class="meal-label">Cena</span><div class="meal-text">${cena}</div></div>
                </div>
            </div>`;
    });
}

function renderShopping(weekNum) {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    const items = shoppingData.filter(row => row.semana == weekNum);
    if(items.length === 0) list.innerHTML = '<li>Sin datos</li>';
    items.forEach(obj => {
        const prod = obj.producto || obj.item || "---";
        list.innerHTML += `<li><input type="checkbox"> ${prod}</li>`;
    });
}

function renderBreakfasts() {
    const list = document.getElementById('breakfast-list');
    list.innerHTML = '';
    if(breakfastData && Array.isArray(breakfastData)) {
        breakfastData.forEach(row => {
            list.innerHTML += `<li><strong>${row.opcion || ''}:</strong> ${row.descripcion || ''}</li>`;
        });
    }
}

window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName + '-view').classList.add('active');
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'menu') btns[0].classList.add('active');
    else btns[1].classList.add('active');
};
