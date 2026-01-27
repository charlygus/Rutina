// ✅ TUS DATOS
const SHEET_ID = '1xHYqCb5gNeQBc_wUEfs7fpdtHdI9nuzEUhHVV76Hf94'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDnRSmvkcpP6gSn5A7BeUkBqD0puV3Dtro_FvXapt3vkGDRKfNpy61KQSiSDyBpXEWpw/exec';

let planificadorData = [];
let currentWeek = 1;
let supermarketMode = false;

// Variables para el GESTO SWIPE
let touchStartX = 0;
let touchEndX = 0;

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(cargarHistorialPeso);

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    
    // Botones de flecha
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));

    // --- LOGICA DE SWIPE (DESLIZAR DEDO) ---
    const menuContainer = document.getElementById('menu-view');
    
    menuContainer.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    menuContainer.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});
});

function handleSwipe() {
    // Umbral mínimo para considerar que es un swipe (50px)
    if (touchEndX < touchStartX - 50) {
        // Deslizar a Izquierda -> Siguiente Semana
        changeWeek(1);
    }
    if (touchEndX > touchStartX + 50) {
        // Deslizar a Derecha -> Semana Anterior
        changeWeek(-1);
    }
}

// --- CARGA DE DATOS ---
async function loadData() {
    const label = document.getElementById('current-week-label');
    try {
        const nombrePestana = encodeURIComponent("MENÚ");
        const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/${nombrePestana}`);
        const rawData = await res.json();
        
        if (!Array.isArray(rawData) || rawData.error) throw new Error("Error leyendo hoja");

        // Normalizador de Columnas
        planificadorData = rawData.map(row => {
            const cleanRow = {};
            Object.keys(row).forEach(key => {
                const k = key.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                if (k === 'semana') cleanRow.Semana = row[key];
                else if (k === 'dia') cleanRow.Dia = row[key];
                else if (k === 'momento') cleanRow.Momento = row[key];
                else if (k === 'plato') cleanRow.Plato = row[key];
                else if (k === 'receta') cleanRow.Receta = row[key];
                else if (k.includes('carniceria')) cleanRow.Carniceria = row[key];
                else if (k.includes('pescaderia')) cleanRow.Pescaderia = row[key];
                else if (k.includes('fruteria')) cleanRow.Fruteria = row[key];
                else if (k.includes('refrigerado')) cleanRow.Refrigerados = row[key];
                else if (k.includes('despensa')) cleanRow.Despensa = row[key];
            });
            return cleanRow;
        });

        renderWeek(currentWeek);
        renderShopping();
    } catch (e) {
        label.textContent = "Error";
        console.error(e);
    }
}

function changeWeek(dir) {
    let next = currentWeek + dir;
    if (planificadorData.some(r => r.Semana == next)) {
        currentWeek = next;
        renderWeek(currentWeek);
        supermarketMode = false; 
        const toggle = document.getElementById('super-mode-toggle');
        if(toggle) toggle.checked = false;
        renderShopping();
    }
}

// --- RENDERIZADO DEL MENÚ (AHORA CON RECETAS) ---
function renderWeek(num) {
    document.getElementById('current-week-label').textContent = `Semana ${num}`;
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    const filasSemana = planificadorData.filter(r => r.Semana == num);
    
    if (filasSemana.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">Vacío...</p>`;
        return;
    }

    const diasAgrupados = {};
    const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    filasSemana.forEach(fila => {
        if (!fila.Dia) return;
        const diaLimpio = fila.Dia.trim().charAt(0).toUpperCase() + fila.Dia.trim().slice(1).toLowerCase();
        let diaKey = diaLimpio;
        if(diaLimpio === "Miercoles") diaKey = "Miércoles";
        if(diaLimpio === "Sabado") diaKey = "Sábado";

        if (!diasAgrupados[diaKey]) diasAgrupados[diaKey] = {};
        
        // 🔥 AHORA GUARDAMOS EL OBJETO ENTERO (Plato + Receta)
        const datoPlato = { nombre: fila.Plato, receta: fila.Receta };

        const momento = (fila.Momento || "").toLowerCase();
        if(momento.includes("desayuno")) diasAgrupados[diaKey].Desayuno = datoPlato;
        if(momento.includes("comida")) diasAgrupados[diaKey].Comida = datoPlato;
        if(momento.includes("cena")) diasAgrupados[diaKey].Cena = datoPlato;
    });

    ordenDias.forEach(nombreDia => {
        let platos = diasAgrupados[nombreDia];
        if (platos) {
            container.innerHTML += `
                <div class="day-item">
                    <div class="day-header">${nombreDia}</div>
                    <div class="day-body">
                        ${renderMealRow('Desayuno', platos.Desayuno)}
                        ${renderMealRow('Comida', platos.Comida)}
                        ${renderMealRow('Cena', platos.Cena)}
                    </div>
                </div>`;
        }
    });
}

// Helper para pintar la fila y añadir el evento onclick si hay receta
function renderMealRow(label, data) {
    if (!data || !data.nombre) return `
        <div class="meal-row">
            <span class="meal-label">${label}</span>
            <div class="meal-text">---</div>
        </div>`;

    // Si hay receta, ponemos clase clickable y evento onclick
    // Escapamos comillas simples para que no rompa el HTML
    const recetaSafe = data.receta ? data.receta.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
    const nombreSafe = data.nombre.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    
    const clickAttr = data.receta 
        ? `class="meal-text meal-clickable" onclick="abrirReceta('${nombreSafe}', '${recetaSafe}')"` 
        : `class="meal-text"`;

    return `
        <div class="meal-row">
            <span class="meal-label">${label}</span>
            <div ${clickAttr}>${data.nombre} ${data.receta ? ' ℹ️' : ''}</div>
        </div>`;
}

// --- MODAL DE RECETAS ---
window.abrirReceta = (plato, receta) => {
    document.getElementById('modal-title').textContent = plato;
    document.getElementById('modal-body').textContent = receta || "Sin instrucciones.";
    document.getElementById('recipe-modal').classList.add('open');
};

window.cerrarReceta = () => {
    document.getElementById('recipe-modal').classList.remove('open');
};

// --- EL RESTO DE FUNCIONES (COMPRA Y PESO) SIGUEN IGUAL ---
// ... (Copia aquí abajo las funciones toggleSuperMode, renderShopping, enviarPeso, cargarHistorialPeso... del script anterior)
// Para no hacer el mensaje eterno, el resto de la lógica de Compra y Peso NO cambia.
// Solo asegúrate de tener toggleSuperMode, renderShopping, enviarPeso, cargarHistorialPeso, actualizarKPIs, dibujarGrafico, saveStatus y showTab.

function toggleSuperMode() {
    supermarketMode = document.getElementById('super-mode-toggle').checked;
    renderShopping();
}

function renderShopping() {
    const list = document.getElementById('shopping-list');
    const subtitle = document.getElementById('shopping-subtitle');
    list.innerHTML = '';

    let targetWeeks = [currentWeek];
    if (supermarketMode) {
        if (currentWeek <= 2) targetWeeks = [1, 2];
        else targetWeeks = [3, 4];
        subtitle.textContent = `Ingredientes semanas: ${targetWeeks.join(' y ')}`;
    } else {
        subtitle.textContent = `Ingredientes semana ${currentWeek}`;
    }

    const inventory = {}; 
    const colsIngredientes = ['Carniceria', 'Pescaderia', 'Fruteria', 'Refrigerados', 'Despensa'];
    
    const filasObjetivo = planificadorData.filter(r => targetWeeks.some(w => r.Semana == w));

    filasObjetivo.forEach(fila => {
        colsIngredientes.forEach(col => {
            if (fila[col]) {
                const items = fila[col].toString().split(',');
                items.forEach(rawItem => {
                    let item = rawItem.trim();
                    if (!item) return;
                    let key = item.toLowerCase();
                    let display = item.charAt(0).toUpperCase() + item.slice(1);
                    if (!inventory[key]) inventory[key] = { name: display, count: 0, origins: [] };
                    inventory[key].count++;
                    inventory[key].origins.push(`S${fila.Semana} ${fila.Dia}: ${fila.Momento}`);
                });
            }
        });
    });

    const sortedKeys = Object.keys(inventory).sort();
    if (sortedKeys.length === 0) {
        list.innerHTML = '<li style="color:#aaa; padding:15px;">No hay ingredientes.</li>';
        return;
    }
    sortedKeys.forEach(key => {
        const data = inventory[key];
        const id = `shop-${supermarketMode?'super':'w'}-${targetWeeks.join('')}-${key.replace(/\s+/g, '')}`;
        const checked = localStorage.getItem(id) === 'true';
        const detailsHtml = data.origins.map(o => `<span>• ${o}</span>`).join('<br>');

        list.innerHTML += `
            <li>
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="saveStatus('${id}', this.checked)">
                <div class="item-content">
                    <label class="item-title" for="${id}">${data.name} <span style="font-weight:normal; color:#555;">(x${data.count})</span></label>
                    <small class="item-details">${detailsHtml}</small>
                </div>
            </li>`;
    });
}

async function enviarPeso() {
    const input = document.getElementById('weight-input');
    const btn = document.getElementById('btn-save-weight');
    const msg = document.getElementById('weight-msg');
    const peso = parseFloat(input.value);
    if (!peso || peso <= 0) { msg.textContent = "Peso incorrecto"; return; }
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
        cargarHistorialPeso();
    } catch (error) { msg.textContent = "Error conexión"; } 
    finally { btn.disabled = false; btn.textContent = "Guardar"; }
}

async function cargarHistorialPeso() {
    try {
        const res = await fetch(`${SCRIPT_URL}?accion=leer`);
        const json = await res.json();
        if (json.datos && json.datos.length > 0) {
            actualizarKPIs(json.datos);
            dibujarGrafico(json.datos);
        }
    } catch (e) { console.error("Error peso", e); }
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
        curveType: 'function', legend: { position: 'none' }, colors: ['#000'],
        lineWidth: 3, pointSize: 5, vAxis: { gridlines: { color: '#f0f0f0' } },
        hAxis: { textStyle: { color: '#999', fontSize: 10 } },
        chartArea: { width: '85%', height: '80%' }
    };
    const chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}

window.saveStatus = (id, state) => { localStorage.setItem(id, state); };
window.showTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.getElementById(name + '-view').classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    if (name === 'weight') cargarHistorialPeso();
};
