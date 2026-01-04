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
        const [menuRes, shopRes] = await Promise.all([
            fetch(`https://opensheet.elk.sh/${SHEET_ID}/Menu`),
            fetch(`https://opensheet.elk.sh/${SHEET_ID}/Compra`)
        ]);
        menuData = await menuRes.json();
        shoppingData = await shopRes.json();
        
        if (!Array.isArray(menuData) || menuData.error) throw new Error();

        renderWeek(currentWeek);
        renderShopping(currentWeek);
    } catch (e) {
        label.textContent = "Error";
        console.error("Error al cargar Google Sheets");
    }
}

function changeWeek(dir) {
    let next = currentWeek + dir;
    if (menuData.some(r => r.semana == next)) {
        currentWeek = next;
        renderWeek(currentWeek);
        renderShopping(currentWeek);
    }
}

function renderWeek(num) {
    document.getElementById('current-week-label').textContent = `Semana ${num}`;
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    const days = menuData.filter(r => r.semana == num);

    days.forEach(d => {
        container.innerHTML += `
            <div class="day-item">
                <div class="day-header">${d.dia || d.Dia || d.Día || ''}</div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Desayuno</span>
                        <div class="meal-text">${d.desayuno || d.Desayuno || '---'}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${d.comida || d.Comida || '---'}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${d.cena || d.Cena || '---'}</div>
                    </div>
                </div>
            </div>`;
    });
}

function renderShopping(num) {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    const items = shoppingData.filter(r => r.semana == num);

    if (items.length === 0) {
        list.innerHTML = '<li style="color:#aaa; border:none;">No hay items para esta semana</li>';
    }

    items.forEach(obj => {
        const prod = obj.producto || obj.item || "---";
        // Generamos un ID único por semana y producto para la memoria
        const id = `shop-w${num}-${prod.replace(/\s+/g, '')}`;
        const checked = localStorage.getItem(id) === 'true';
        
        list.innerHTML += `
            <li>
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} 
                       onchange="saveStatus('${id}', this.checked)">
                <label for="${id}">${prod}</label>
            </li>`;
    });
    loadBasics();
}

// Guarda el estado en localStorage
window.saveStatus = (id, state) => {
    localStorage.setItem(id, state);
};

// Carga el estado de los checks de la sección Básicos
function loadBasics() {
    ['b1','b2','b3','b4'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.checked = localStorage.getItem(id) === 'true';
    });
}

// Manejo de pestañas
window.showTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    
    document.getElementById(name + '-view').classList.add('active');
    // Activa el botón que disparó el evento
    if (event) event.currentTarget.classList.add('active');
};
