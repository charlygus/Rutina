// ✅ CONFIGURACIÓN CORREGIDA
const SHEET_ID = '1xHYqCb5gNeQBc_wUEfs7fpdtHdI9nuzEUhHVV76Hf94'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDnRSmvkcpP6gSn5A7BeUkBqD0puV3Dtro_FvXapt3vkGDRKfNpy61KQSiSDyBpXEWpw/exec';

let planificadorData = [];
let currentWeek = 1;
let supermarketMode = false;

// Carga de gráficos (Google Charts)
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(cargarHistorialPeso);

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

// --- CARGA DE DATOS (NUEVA ESTRUCTURA PLANIFICADOR) ---
async function loadData() {
    const label = document.getElementById('current-week-label');
    try {
        // Leemos todo de la hoja 'Planificador'
        const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/Planificador`);
        planificadorData = await res.json();
        
        // Verificación de seguridad
        if (!Array.isArray(planificadorData) || planificadorData.error) {
            throw new Error("Formato incorrecto o hoja no encontrada");
        }

        renderWeek(currentWeek);
        renderShopping();
    } catch (e) {
        label.textContent = "Error";
        console.error("Error al cargar Google Sheets. Revisa que la pestaña se llame 'Planificador'", e);
    }
}

function changeWeek(dir) {
    let next = currentWeek + dir;
    // Comprobamos si existe algo de esa semana en los datos para no pasarnos
    if (planificadorData.some(r => r.Semana == next)) {
        currentWeek = next;
        renderWeek(currentWeek);
        
        // Al cambiar de semana, desactivamos el modo super por claridad
        supermarketMode = false; 
        const toggle = document.getElementById('super-mode-toggle');
        if(toggle) toggle.checked = false;
        
        renderShopping();
    }
}

// --- RENDERIZADO DEL MENÚ ---
function renderWeek(num) {
    document.getElementById('current-week-label').textContent = `Semana ${num}`;
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    // 1. Filtramos las filas de la semana actual
    const filasSemana = planificadorData.filter(r => r.Semana == num);
    
    // 2. Agrupamos por DÍA para montar las tarjetas
    const diasAgrupados = {};
    const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    filasSemana.forEach(fila => {
        // Normalizamos el nombre del día (quita espacios extra)
        const dia = (fila.Dia || fila.Día || "").trim();
        if (!diasAgrupados[dia]) diasAgrupados[dia] = {};
        
        // Guardamos el plato según el momento (Desayuno/Comida/Cena)
        diasAgrupados[dia][fila.Momento] = fila.Plato;
    });

    // 3. Pintamos las tarjetas
    ordenDias.forEach(nombreDia => {
        if (diasAgrupados[nombreDia]) {
            const platos = diasAgrupados[nombreDia];
            container.innerHTML += `
                <div class="day-item">
                    <div class="day-header">${nombreDia}</div>
                    <div class="day-body">
                        <div class="meal-row">
                            <span class="meal-label">Desayuno</span>
                            <div class="meal-text">${platos.Desayuno || '---'}</div>
                        </div>
                        <div class="meal-row">
                            <span class="meal-label">Comida</span>
                            <div class="meal-text">${platos.Comida || '---'}</div>
                        </div>
                        <div class="meal-row">
                            <span class="meal-label">Cena</span>
                            <div class="meal-text">${platos.Cena || '---'}</div>
                        </div>
                    </div>
                </div>`;
        }
    });
}

// --- LÓGICA DE COMPRA INTELIGENTE ---
function toggleSuperMode() {
    supermarketMode = document.getElementById('super-mode-toggle').checked;
    renderShopping();
}

function renderShopping() {
    const list = document.getElementById('shopping-list');
    const subtitle = document.getElementById('shopping-subtitle');
    list.innerHTML = '';

    // 1. Definir qué semanas vamos a leer
    let targetWeeks = [currentWeek];
    
    if (supermarketMode) {
        // Modo Super: Agrupa 1-2 o 3-4
        if (currentWeek <= 2) targetWeeks = [1, 2];
        else targetWeeks = [3, 4];
        subtitle.textContent = `Mostrando ingredientes semanas: ${targetWeeks.join(' y ')}`;
    } else {
        subtitle.textContent = `Mostrando ingredientes de la semana ${currentWeek}`;
    }

    // 2. Procesar ingredientes
    const inventory = {}; 
    const colsIngredientes = ['Carniceria', 'Pescaderia', 'Fruteria', 'Refrigerados', 'Despensa'];

    // Filtramos las filas de las semanas objetivo
    const filasObjetivo = planificadorData.filter(r => targetWeeks.includes(parseInt(r.Semana)));

    filasObjetivo.forEach(fila => {
        colsIngredientes.forEach(col => {
            if (fila[col]) {
                // Separar por comas
                const items = fila[col].toString().split(',');
                
                items.forEach(rawItem => {
                    let item = rawItem.trim();
                    if (!item) return;

                    // Clave para agrupar (minúsculas)
                    let key = item.toLowerCase();
                    // Nombre bonito (Capitalizado)
                    let display = item.charAt(0).toUpperCase() + item.slice(1);

                    if (!inventory[key]) {
                        inventory[key] = { name: display, count: 0, origins: [] };
                    }

                    inventory[key].count++;
                    // Guardamos origen: "S1 Lun: Comida (Plato)"
                    inventory[key].origins.push(
                        `S${fila.Semana} ${fila.Dia.substring(0,3)}: ${fila.Momento} (${fila.Plato})`
                    );
                });
            }
        });
    });

    // 3. Pintar la lista ordenada
    const sortedKeys = Object.keys(inventory).sort();

    if (sortedKeys.length === 0) {
        list.innerHTML = '<li style="color:#aaa; border:none; padding:15px;">No hay ingredientes para esta selección.</li>';
        return;
    }

    sortedKeys.forEach(key => {
        const data = inventory[key];
        // ID único para guardar el check en memoria
        const id = `shop-${supermarketMode?'super':'w'}-${targetWeeks.join('')}-${key.replace(/\s+/g, '')}`;
        const checked = localStorage.getItem(id) === 'true';

        // Formatear detalles (origins)
        const detailsHtml = data.origins.map(o => `<span>• ${o}</span>`).join('<br>');

        list.innerHTML += `
            <li>
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} 
                       onchange="saveStatus('${id}', this.checked)">
                <div class="item-content">
                    <label class="item-title" for="${id}">
                        ${data.name} <span style="font-weight:normal; color:#555;">(x${data.count})</span>
                    </label>
                    <small class="item-details">
                        ${detailsHtml}
                    </small>
                </div>
            </li>`;
    });
}


// --- LÓGICA PESO (API Google Script) ---
async function enviarPeso() {
    const input = document.getElementById('weight-input');
    const btn = document.getElementById('btn-save-weight');
    const msg = document.getElementById('weight-msg');
    
    const peso = parseFloat(input.value);
    if (!peso || peso <= 0) { msg.textContent = "Introduce un peso válido"; return; }

    btn.disabled = true; btn.textContent = "..."; msg.textContent = "Guardando...";

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ accion: 'guardar', peso: peso }),
            headers: { "Content-Type": "text/plain" }
        });
        msg.textContent = "¡Guardado!";
        input.value = '';
        setTimeout(() => { msg.textContent = ''; }, 3000);
        cargarHistorialPeso(); // Recargar gráfica
    } catch (error) {
        msg.textContent = "Error de conexión"; 
        console.error(error);
    } finally {
        btn.disabled = false; btn.textContent = "Guardar";
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
    } catch (e) { console.error("Error cargando historial peso", e); }
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
    historial.forEach(reg => dataArray.push([reg.fecha, parseFloat(reg.peso)]));

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
window.saveStatus = (id, state) => { localStorage.setItem(id, state); };

window.showTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    
    document.getElementById(name + '-view').classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    
    if (name === 'weight') cargarHistorialPeso();
};
