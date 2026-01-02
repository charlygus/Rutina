// 👇 TU ID YA ESTÁ PUESTO AQUÍ 👇
const SHEET_ID = '1jMrd9A3Pvs-r606i8H6NYp6RAw-46rE5tlGfXUL0QK4';

let menuData = [];
let shoppingData = [];
let breakfastData = [];
let currentWeek = 1;

document.addEventListener('DOMContentLoaded', async () => {
    // HE BORRADO EL BLOQUE "IF" QUE DABA PROBLEMAS
    
    await loadData();
    
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

async function loadData() {
    try {
        document.getElementById('current-week-label').textContent = "Sincronizando...";
        
        // 1. Cargar Menú (Con tilde, como tú querías)
        const menuRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menú`);
        menuData = await menuRes.json();

        // 2. Cargar Compra (Busca la columna 'producto')
        const shopRes = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`);
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
        document.getElementById('current-week-label').textContent = "Error";
        // Si falla, muestra el error real en la consola o alerta
        alert('Error conectando. Verifica que la hoja "Rutina" está publicada en la web (Archivo > Compartir > Publicar en la web).');
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
        container.innerHTML = '<p style="text-align:center; padding:20px;">No hay menú para esta semana en el Excel.</p>';
        return;
    }

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
        // Usa 'producto' como pediste
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

window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName + '-view').classList.add('active');
    
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'menu') btns[0].classList.add('active');
    else btns[1].classList.add('active');
};
