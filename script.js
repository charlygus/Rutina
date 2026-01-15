const SHEET_ID = '1jMrd9A3Pvs-r606i8H6NYp6RAw-46rE5tlGfXUL0QK4'; // Tu ID de hoja para el menú
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwvJCEPkvTYL8drM78COnm0cjd0EBWH1hQDpzP6jnxIgZUxDZTgYIAKd-Diuh2QxJc/exec'; // <--- ⚠️ PEGA AQUÍ TU URL

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

// --- LÓGICA MENÚ Y COMPRA (Original) ---
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

// --- LÓGICA NUEVA: PESO ---

// 1. Enviar Peso
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
        // Usamos no-cors/text para evitar problemas complejos de CORS con Google Scripts
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ accion: 'guardar', peso: peso }),
            headers: { "Content-Type": "text/plain" }
        });

        msg.textContent = "¡Guardado!";
        input.value = '';
        setTimeout(() => { msg.textContent = ''; }, 3000);
        
        // Recargar datos para actualizar gráfica
        cargarHistorialPeso();

    } catch (error) {
        msg.textContent = "Error al guardar";
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar";
    }
}

// 2. Leer y Pintar Gráfica
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
    
    // Calcular tendencia simple
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

// --- UTILIDADES GLOBALES ---
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
    
    // Redibujar gráfico si entramos en peso (para evitar bugs de tamaño oculto)
    if (name === 'weight') cargarHistorialPeso();
};
