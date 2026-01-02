// 👇👇👇 AQUÍ ES DONDE TIENES QUE PEGAR TU CÓDIGO 👇👇👇
const SHEET_ID = '1xY_89Gtg...q7L'; 
// 👆👆👆 Borra lo de dentro de las comillas y pon tu ID (ej: 1BxiMM...)

let menuData = [];
let shoppingData = [];
let breakfastData = [];
let currentWeek = 1;

document.addEventListener('DOMContentLoaded', async () => {
    // Verificación de seguridad por si se te olvida poner el ID
    if(SHEET_ID === 'PEGAR_TU_CODIGO_LARGO_AQUI') {
        alert("¡Alto ahí! 🛑 Falta poner el ID de tu Google Sheet en la primera línea del archivo script.js");
        return;
    }
    
    await loadData();
    
    // Configurar botones de semana anterior/siguiente
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

async function loadData() {
    try {
        document.getElementById('current-week-label').textContent = "Sincronizando...";
        
        // 1. Cargar Menú
        const menuRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menu`);
        menuData = await menuRes.json();

        // 2. Cargar Compra (Ahora buscará la columna 'producto')
        const shopRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`);
        shoppingData = await shopRes.json();

        // 3. Cargar Desayunos
        const breakRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Desayunos`);
        breakfastData = await breakRes.json();

        // Si todo va bien, pintamos la pantalla
        renderWeek(currentWeek);
        renderShopping(currentWeek);
        renderBreakfasts();

    } catch (error) {
        console.error(error);
        document.getElementById('current-week-label').textContent = "Error de conexión";
        alert('No se pueden leer los datos. Asegúrate de:\n1. Que el ID es correcto.\n2. Que la hoja está "Publicada en la web".');
    }
}

function changeWeek(direction) {
    let newWeek = currentWeek + direction;
    // Comprobamos si existen datos para esa nueva semana
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

    // Filtramos los días de la semana actual
    const weekDays = menuData.filter(row => row.semana == weekNum);

    weekDays.forEach(day => {
        // Detectamos si es día trampa (cheat) para ponerle estrellita o color diferente
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
        // ⚠️ AQUÍ ESTÁ EL CAMBIO: Usamos obj.producto en vez de obj.item
        list.innerHTML += `<li><input type="checkbox"> ${obj.producto}</li>`;
    });
}

function renderBreakfasts() {
    const list = document.getElementById('breakfast-list');
    list.innerHTML = '';
    breakfastData.forEach(row => {
        list.innerHTML += `<li><strong>${row.opcion}:</strong> ${row.descripcion}</li>`;
    });
}

// Función para cambiar entre pestañas (Menú / Compra)
window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName + '-view').classList.add('active');
    
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'menu') btns[0].classList.add('active');
    else btns[1].classList.add('active');
};
