// ✅ TUS DATOS
const SHEET_ID = '1xHYqCb5gNeQBc_wUEfs7fpdtHdI9nuzEUhHVV76Hf94'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDnRSmvkcpP6gSn5A7BeUkBqD0puV3Dtro_FvXapt3vkGDRKfNpy61KQSiSDyBpXEWpw/exec';

// 📅 FECHA DE INICIO DE LA ROTACIÓN (Lunes de la Semana 1)
const FECHA_INICIO = new Date("2026-01-12T00:00:00"); 

let planificadorData = [];
let currentViewDate = new Date(); // La fecha que estamos viendo (siempre será Lunes)
let supermarketMode = false;

// Variables Gesto Swipe
let touchStartX = 0;
let touchEndX = 0;

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(cargarHistorialPeso);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Calcular el Lunes de la semana actual real al arrancar
    currentViewDate = getMonday(new Date());

    await loadData();
    
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));

    // Swipe
    const menuContainer = document.getElementById('menu-view');
    menuContainer.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    menuContainer.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});
});

function handleSwipe() {
    if (touchEndX < touchStartX - 50) changeWeek(1);
    if (touchEndX > touchStartX + 50) changeWeek(-1);
}

// --- UTILIDAD DE FECHAS ---
function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // Ajuste para que Lunes sea el primer día
    d.setDate(diff);
    d.setHours(0,0,0,0); // Resetear hora para evitar errores
    return d;
}

function formatDate(date) {
    // Devuelve "27 Ene"
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
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

        renderWeek();
        renderShopping();
    } catch (e) {
        label.textContent = "Error";
        console.error(e);
    }
}

// --- CAMBIO DE SEMANA (LÓGICA TEMPORAL) ---
function changeWeek(dir) {
    // Sumamos o restamos 7 días a la fecha que estamos viendo
    currentViewDate.setDate(currentViewDate.getDate() + (dir * 7));
    
    // Reseteamos modo super y renderizamos
    supermarketMode = false;
    const toggle = document.getElementById('super-mode-toggle');
    if(toggle) toggle.checked = false;
    
    renderWeek();
    renderShopping();
}

// --- RENDERIZADO DEL MENÚ (AHORA CON FECHAS) ---
function renderWeek() {
    // 1. Calcular qué número de semana (1-4) toca según la fecha
    // Diferencia en milisegundos desde el inicio
    const diffTime = currentViewDate - FECHA_INICIO;
    // Convertir a semanas
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    // Fórmula mágica para rotar 1, 2, 3, 4 infinitamente
    // Usamos modulo matemáticas positivas para que funcione hacia el pasado
    let semanaNum = ((diffWeeks % 4) + 4) % 4 + 1;

    // 2. Calcular fecha fin de semana para el título
    let finSemana = new Date(currentViewDate);
    finSemana.setDate(finSemana.getDate() + 6);
    
    document.getElementById('current-week-label').innerHTML = 
        `Semana ${semanaNum}<br><span style="font-size:0.7em; font-weight:normal;">${formatDate(currentViewDate)} - ${formatDate(finSemana)}</span>`;
    
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    const filasSemana = planificadorData.filter(r => r.Semana == semanaNum);
    
    if (filasSemana.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">Vacío...</p>`;
        return;
    }

    const diasAgrupados = {};
    const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    // Procesar datos
    filasSemana.forEach(fila => {
        if (!fila.Dia) return;
        const diaLimpio = fila.Dia.trim().charAt(0).toUpperCase() + fila.Dia.trim().slice(1).toLowerCase();
        let diaKey = diaLimpio;
        if(diaLimpio === "Miercoles") diaKey = "Miércoles";
        if(diaLimpio === "Sabado") diaKey = "Sábado";
        if (!diasAgrupados[diaKey]) diasAgrupados[diaKey] = {};
        
        const datoPlato = { nombre: fila.Plato, receta: fila.Receta };
        const momento = (fila.Momento || "").toLowerCase();
        if(momento.includes("desayuno")) diasAgrupados[diaKey].Desayuno = datoPlato;
        if(momento.includes("comida")) diasAgrupados[diaKey].Comida = datoPlato;
        if(momento.includes("cena")) diasAgrupados[diaKey].Cena = datoPlato;
    });

    // Pintar tarjetas con FECHAS CALCULADAS
    const hoyReal = new Date();
    hoyReal.setHours(0,0,0,0);

    ordenDias.forEach((nombreDia, index) => {
        // Calcular la fecha exacta de este día de la tarjeta
        let fechaTarjeta = new Date(currentViewDate);
        fechaTarjeta.setDate(fechaTarjeta.getDate() + index);
        let fechaTexto = formatDate(fechaTarjeta);

        let platos = diasAgrupados[nombreDia];
        if (platos) {
            // Comprobamos si es HOY (Día y Mes y Año exactos)
            const esHoy = fechaTarjeta.getTime() === hoyReal.getTime();
            const claseExtra = esHoy ? 'today' : '';
            const idDia = esHoy ? 'id="dia-actual"' : '';

            container.innerHTML += `
                <div class="day-item ${claseExtra}" ${idDia}>
                    <div class="day-header" style="display:flex; justify-content:space-between;">
                        <span>${nombreDia}</span>
                        <span style="color:#888; font-weight:normal;">${fechaTexto}</span>
                    </div>
                    <div class="day-body">
                        ${renderMealRow('Desayuno', platos.Desayuno)}
                        ${renderMealRow('Comida', platos.Comida)}
                        ${renderMealRow('Cena', platos.Cena)}
                    </div>
                </div>`;
        }
    });

    // Auto-scroll a hoy
    setTimeout(() => {
        const diaActual = document.getElementById('dia-actual');
        if (diaActual) {
            const y = diaActual.getBoundingClientRect().top + window.scrollY - 90;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
    }, 150);
}

// Helper para filas
function renderMealRow(label, data) {
    if (!data || !data.nombre) return `<div class="meal-row"><span class="meal-label">${label}</span><div class="meal-text">---</div></div>`;
    
    const recetaSafe = data.receta ? data.receta.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
    const nombreSafe = data.nombre.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const clickAttr = data.receta ? `class="meal-text meal-clickable" onclick="abrirReceta('${nombreSafe}', '${recetaSafe}')"` : `class="meal-text"`;

    return `<div class="meal-row"><span class="meal-label">${label}</span><div ${clickAttr}>${data.nombre} ${data.receta ? ' ℹ️' : ''}</div></div>`;
}

// --- MODAL RECETAS ---
window.abrirReceta = (plato, receta) => {
    document.getElementById('modal-title').textContent = plato;
    document.getElementById('modal-body').textContent = receta || "Sin instrucciones.";
    document.getElementById('recipe-modal').classList.add('open');
};
window.cerrarReceta = () => { document.getElementById('recipe-modal').classList.remove('open'); };

// --- COMPRA Y PESO (Actualizados para usar currentViewDate) ---
function toggleSuperMode() {
    supermarketMode = document.getElementById('super-mode-toggle').checked;
    renderShopping();
}

function renderShopping() {
    const list = document.getElementById('shopping-list');
    const subtitle = document.getElementById('shopping-subtitle');
    list.innerHTML = '';

    // Calcular el número de semana ACTUAL basado en currentViewDate
    const diffTime = currentViewDate - FECHA_INICIO;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const semanaNum = ((diffWeeks % 4) + 4) % 4 + 1;

    let targetWeeks = [semanaNum];
    if (supermarketMode) {
        if (semanaNum <= 2) targetWeeks = [1, 2];
        else targetWeeks = [3, 4];
        subtitle.textContent = `Ingredientes semanas: ${targetWeeks.join(' y ')}`;
    } else {
        subtitle.textContent = `Ingredientes semana ${semanaNum}`;
    }

    const inventory = {}; 
    const colsIngredientes = ['Carniceria', 'Pescaderia', 'Fruteria', 'Refrigerados', 'Despensa'];
    
    // Filtro usando '==' para flexibilidad
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
    if (sortedKeys.length === 0) { list.innerHTML = '<li style="color:#aaa; padding:15px;">No hay ingredientes.</li>'; return; }
    
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

// --- PESO (Sin cambios) ---
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
        msg.textContent = "¡Guardado!"; input.value = ''; setTimeout(() => { msg.textContent = ''; }, 3000); cargarHistorialPeso();
    } catch (error) { msg.textContent = "Error conexión"; } 
    finally { btn.disabled = false; btn.textContent = "Guardar"; }
}

async function cargarHistorialPeso() {
    try {
        const res = await fetch(`${SCRIPT_URL}?accion=leer`);
        const json = await res.json();
        if (json.datos && json.datos.length > 0) { actualizarKPIs(json.datos); dibujarGrafico(json.datos); }
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

// --- UTILIDADES GLOBALES (Copiar y Limpiar checks) ---
function copiarLista() {
    const items = document.querySelectorAll('#shopping-list li');
    let texto = "🛒 *LISTA DE LA COMPRA*\n\n";
    items.forEach(li => {
        const nombre = li.querySelector('.item-title').innerText.split('(')[0].trim();
        const cantidad = li.querySelector('.item-title span').innerText;
        const check = li.querySelector('input').checked ? "✅" : "⬜";
        texto += `${check} ${nombre} ${cantidad}\n`;
    });
    navigator.clipboard.writeText(texto).then(() => { alert("¡Copiada al portapapeles!"); });
}

function limpiarChecks() {
    if(confirm("¿Borrar marcados?")) {
        Object.keys(localStorage).forEach(key => { if(key.startsWith('shop-')) localStorage.removeItem(key); });
        renderShopping();
    }
}

window.saveStatus = (id, state) => { localStorage.setItem(id, state); };
window.showTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.getElementById(name + '-view').classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    if (name === 'weight') cargarHistorialPeso();
};
