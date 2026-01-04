const SHEET_ID = '1jMrd9A3Pvs-r606i8H6NYp6RAw-46rE5tlGfXUL0QK4';

let menuData = [];
let shoppingData = [];
let currentWeek = 1;

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

async function loadData() {
    const label = document.getElementById('current-week-label');
    
    try {
        label.textContent = "...";
        
        // 1. Cargar MENU y COMPRA (Desayunos ya no es necesario cargar aparte)
        const [menuRes, shopRes] = await Promise.all([
            fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menu`),
            fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`)
        ]);
        
        menuData = await menuRes.json();
        shoppingData = await shopRes.json();
        
        // Validación básica
        if (!Array.isArray(menuData) || menuData.error) {
            throw new Error("Error cargando datos");
        }

        renderWeek(currentWeek);
        renderShopping(currentWeek);

    } catch (error) {
        console.error(error);
        label.textContent = "Error";
        alert("No se pudo conectar con la hoja de cálculo. Revisa el ID o las pestañas.");
    }
}

function changeWeek(direction) {
    let newWeek = currentWeek + direction;
    // Comprobamos si existe esa semana en los datos antes de cambiar
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
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#888">No hay menú para esta semana</div>';
        return;
    }

    weekDays.forEach(day => {
        // LEEMOS LA COLUMNA 'desayuno' DEL EXCEL
        const desayuno = day.desayuno || day.Desayuno || "---";
        const comida = day.comida || day.Comida || "---";
        const cena = day.cena || day.Cena || "---";
        const dia = day.dia || day.Dia || day.Día || "";
        const isCheat = day.tipo && day.tipo.toLowerCase().includes('cheat');
        
        container.innerHTML += `
            <div class="day-item">
                <div class="day-header ${isCheat ? 'cheat-day' : ''}">
                    <span>${dia}</span>
                                    </div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Desayuno</span>
                        <div class="meal-text">${desayuno}</div>
                    </div>

                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${comida}</div>
                    </div>
                    
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${cena}</div>
                    </div>
                </div>
            </div>`;
    });
}

function renderShopping(weekNum) {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    const items = shoppingData.filter(row => row.semana == weekNum);
    
    if(items.length === 0) list.innerHTML = '<li style="color:#888; padding:10px;">Nada que comprar esta semana</li>';
    
    items.forEach(obj => {
        const prod = obj.producto || obj.item || "---";
        list.innerHTML += `<li><input type="checkbox"> <label>${prod}</label></li>`;
    });
}

// FUNCION DE PESTAÑAS ACTUALIZADA A LAS NUEVAS CLASES
window.showTab = function(tabName) {
    // 1. Ocultar contenidos
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // 2. Desactivar botones (quitamos estilo negro)
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
    
    // 3. Activar contenido nuevo
    document.getElementById(tabName + '-view').classList.add('active');
    
    // 4. Activar botón nuevo
    // Buscamos el botón que tenga el onclick correspondiente
    const buttons = document.querySelectorAll('.tab-link');
    if(tabName === 'menu') buttons[0].classList.add('active');
    else buttons[1].classList.add('active');
};
