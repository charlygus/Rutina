const SHEET_ID = '1jMrd9A3Pvs-r606i8H6NYp6RAw-46rE5tlGfXUL0QK4'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwvJCEPkvTYL8drM78COnm0cjd0EBWH1hQDpzP6jnxIgZUxDZTgYIAKd-Diuh2QxJc/exec'; 

let menuData = [];
let shoppingData = [];
let currentWeek = 1;

// Carga de la librería de gráficos
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(cargarHistorialPeso);

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

// --- LÓGICA MENÚ Y COMPRA ---
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
        console.error("Error al cargar Google Sheets Menú");
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
    
    // Filtramos los días de la semana actual
    const days = menuData.filter(r => r.semana == num);

    days.forEach((d, index) => {
        // Obtenemos el índice real del elemento en el array completo para pasarlo a la función
        // Pero como ya tenemos el objeto 'd', podemos pasarlo directamente si lo serializamos
        // O más fácil: guardamos el ID temporal en el DOM para buscarlo luego en 'days'
        
        container.innerHTML += `
            <div class="day-item" onclick="openRecipe(${d.semana}, '${d.dia}')">
                <div class="day-header">${d.dia || ''}</div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Desayuno</span>
                        <div class="meal-text">${d.desayuno || '---'}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${d.comida || '---'}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${d.cena || '---'}</div>
                    </div>
                </div>
            </div>`;
    });
}

// --- NUEVA LÓGICA: MODO COCINA ---

function openRecipe(week, dayName) {
    // Buscar el día correcto en los datos
    const dayData = menuData.find(r => r.semana == week && r.dia == dayName);
    if (!dayData) return;

    // Ocultar cabecera y lista
    document.getElementById('days-container').style.display = 'none';
    document.getElementById('main-header').style.display = 'none';
    document.getElementById('main-tabs').style.display = 'none';

    // Mostrar vista receta
    const view = document.getElementById('recipe-view');
    view.style.display = 'block';
    
    // Rellenar datos
    document.getElementById('recipe-day-title').textContent = dayData.dia;

    // Comida
    document.getElementById('recipe-lunch-name').textContent = dayData.comida;
    document.getElementById('recipe-lunch-steps').innerHTML = formatRecipeText(dayData.receta_comida);
    
    // Cena
    document.getElementById('recipe-dinner-name').textContent = dayData.cena;
    document.getElementById('recipe-dinner-steps').innerHTML = formatRecipeText(dayData.receta_cena);

    // Si no hay receta (ej: día libre), ocultar la tarjeta
    document.getElementById('card-lunch').style.display = dayData.receta_comida ? 'block' : 'none';
    document.getElementById('card-dinner').style.display = dayData.receta_cena ? 'block' : 'none';

    // Scroll arriba
    window.scrollTo(0, 0);
}

function closeRecipe() {
    // Mostrar cabecera y lista
    document.getElementById('days-container').style.display = 'block';
    document.getElementById('main-header').style.display = 'block'; // Usamos flex para el header original pero en CSS está definido .minimal-header
    document.getElementById('main-tabs').style.display = 'flex';

    // Ocultar vista receta
    document.getElementById('recipe-view').style.display = 'none';
}

function formatRecipeText(text) {
    if (!text) return "Sin instrucciones detalladas.";
    // Busca números entre paréntesis como (8) y los convierte en etiqueta
    return text.replace(/\((\d)\)/g, '<span class="fire-tag">🔥 $1</span>');
}


// --- LÓGICA COMPRA ---
function renderShopping(num) {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    const items = shoppingData.filter(r => r.semana == num);

    if (items.length === 0) {
        list.innerHTML = '<li style="color:#aaa; border:none;">No hay items para esta semana</li>';
    }

    items.forEach(obj => {
        const prod = obj.producto || obj.item || "---";
        const id = `shop-w${num}-${prod.replace(/\s+/g, '')}`;
        const checked = localStorage.getItem(id) === 'true';
        
        // Detectar lo que está dentro de <small> para pintarlo gris si quieres, 
        // pero el HTML ya lo renderiza bien.
        
        list.innerHTML += `
            <li>
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} 
                       onchange="saveStatus('${id}', this.checked)">
                <label for="${id}">${prod}</label>
            </li>`;
    });
    loadBasics();
}

// --- LÓGICA PESO ---
async function enviarPeso() {
    const input = document.getElementById('weight-input');
    const btn = document.getElementById('btn-save-weight');
    const msg = document.getElementById('weight-msg');
    
    const peso = parseFloat(input.value);
    if (!peso || peso <= 0) {
        msg.textContent = "Introduce un peso válido";
        return;
    }

    btn.disabled = true;
    btn.textContent = "...";
    msg.textContent = "Guardando...";

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ accion: 'guardar', peso: peso }),
            headers: { "Content-Type": "text/plain" }
        });

        msg.textContent = "¡Guardado!";
        input.value = '';
        setTimeout(() => { msg.textContent = ''; }, 3000);
        cargarHistorialPeso();

    } catch (error) {
        msg.textContent = "Error al guardar";
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar";
    }
}

async function cargarHistorialPeso() {
    try {
        const res = await fetch(`${SCRIPT_URL}?accion=leer`);
        const json = await res.json();
        
        if (json.datos && json.datos.length > 0) {
            actualizarKPIs(json.datos);
            dibujarGrafico(json.datos);
        }
    } catch (e) {
        console.error("Error cargando peso", e);
    }
}

function actualizarKPIs(datos) {
    const actual = datos[datos.length - 1].peso;
    document.getElementById('last-weight').textContent = actual + " kg";
    
    if (datos.length > 1) {
        const previo = datos[datos.length - 2].peso;
        const diff = actual - previo;
        const icon = diff < 0 ? '📉' : (diff > 0 ? '📈' : '➡️');
        document.getElementById('weight-trend').textContent = icon + " " + diff.toFixed(1);
        document.getElementById('weight-trend').style.color = diff < 0 ? '#2ecc71' : '#e74c3c';
    }
}

function dibujarGrafico(historial) {
    const dataArray = [['Fecha', 'Peso']];
    historial.forEach(reg => {
        dataArray.push([reg.fecha, parseFloat(reg.peso)]);
    });

    const data = google.visualization.arrayToDataTable(dataArray);

    const options = {
        curveType: 'function',
        legend: { position: 'none' },
        colors: ['#000'],
        lineWidth: 3,
        pointSize: 5,
        vAxis: { gridlines: { color: '#f0f0f0' } },
        hAxis: { textStyle: { color: '#999', fontSize: 10 } },
        chartArea: { width: '85%', height: '80%' }
    };

    const chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}

// --- UTILIDADES ---
window.saveStatus = (id, state) => {
    localStorage.setItem(id, state);
};

function loadBasics() {
    ['b1','b2','b3','b4'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.checked = localStorage.getItem(id) === 'true';
    });
}

window.showTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    
    document.getElementById(name + '-view').classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    
    if (name === 'weight') cargarHistorialPeso();
};
