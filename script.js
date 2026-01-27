// ✅ TUS DATOS
const SHEET_ID = '1xHYqCb5gNeQBc_wUEfs7fpdtHdI9nuzEUhHVV76Hf94'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDnRSmvkcpP6gSn5A7BeUkBqD0puV3Dtro_FvXapt3vkGDRKfNpy61KQSiSDyBpXEWpw/exec';
const FECHA_INICIO = new Date("2026-01-12T00:00:00"); 

let planificadorData = [];
let currentViewDate = new Date();
let supermarketMode = false;
let touchStartX = 0; let touchEndX = 0;
let wakeLock = null; 

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(cargarHistorialPeso);

document.addEventListener('DOMContentLoaded', async () => {
    currentViewDate = getMonday(new Date());
    await loadData();
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
    const menuContainer = document.getElementById('menu-view');
    menuContainer.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    menuContainer.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, {passive: true});
});

function handleSwipe() { if (touchEndX < touchStartX - 50) changeWeek(1); if (touchEndX > touchStartX + 50) changeWeek(-1); }
function getMonday(d) { d = new Date(d); var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1); d.setDate(diff); d.setHours(0,0,0,0); return d; }
function formatDate(date) { return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''); }

async function loadData() {
    try {
        const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/MENÚ`);
        const rawData = await res.json();
        if (!Array.isArray(rawData) || rawData.error) throw new Error("Error hoja");

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
    } catch (e) { console.error(e); } finally {
        setTimeout(() => { document.getElementById('loading-screen').classList.add('hidden'); }, 500);
    }
}

function changeWeek(dir) {
    currentViewDate.setDate(currentViewDate.getDate() + (dir * 7));
    supermarketMode = false; document.getElementById('super-mode-toggle').checked = false;
    renderWeek(); renderShopping();
}

function renderWeek() {
    const diffTime = currentViewDate - FECHA_INICIO;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    let semanaNum = ((diffWeeks % 4) + 4) % 4 + 1;
    let finSemana = new Date(currentViewDate); finSemana.setDate(finSemana.getDate() + 6);
    
    document.getElementById('current-week-label').innerHTML = `Semana ${semanaNum}<br><span style="font-size:0.7em; font-weight:normal;">${formatDate(currentViewDate)} - ${formatDate(finSemana)}</span>`;
    const container = document.getElementById('days-container'); container.innerHTML = '';
    
    const filasSemana = planificadorData.filter(r => r.Semana == semanaNum);
    const diasAgrupados = {};
    const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    filasSemana.forEach(fila => {
        if (!fila.Dia) return;
        const diaLimpio = fila.Dia.trim().charAt(0).toUpperCase() + fila.Dia.trim().slice(1).toLowerCase();
        let diaKey = diaLimpio; if(diaLimpio === "Miercoles") diaKey = "Miércoles"; if(diaLimpio === "Sabado") diaKey = "Sábado";
        if (!diasAgrupados[diaKey]) diasAgrupados[diaKey] = {};
        const datoPlato = { nombre: fila.Plato, receta: fila.Receta };
        const momento = (fila.Momento || "").toLowerCase();
        if(momento.includes("desayuno")) diasAgrupados[diaKey].Desayuno = datoPlato;
        if(momento.includes("comida")) diasAgrupados[diaKey].Comida = datoPlato;
        if(momento.includes("cena")) diasAgrupados[diaKey].Cena = datoPlato;
    });

    const hoyReal = new Date(); hoyReal.setHours(0,0,0,0);
    ordenDias.forEach((nombreDia, index) => {
        let fechaTarjeta = new Date(currentViewDate); fechaTarjeta.setDate(fechaTarjeta.getDate() + index);
        let platos = diasAgrupados[nombreDia];
        if (platos) {
            const esHoy = fechaTarjeta.getTime() === hoyReal.getTime();
            const claseExtra = esHoy ? 'today' : ''; const idDia = esHoy ? 'id="dia-actual"' : '';
            container.innerHTML += `<div class="day-item ${claseExtra}" ${idDia}><div class="day-header" style="display:flex; justify-content:space-between;"><span>${nombreDia}</span><span style="color:#888; font-weight:normal;">${formatDate(fechaTarjeta)}</span></div><div class="day-body">${renderMealRow('Desayuno', platos.Desayuno)}${renderMealRow('Comida', platos.Comida)}${renderMealRow('Cena', platos.Cena)}</div></div>`;
        }
    });
    setTimeout(() => { const diaActual = document.getElementById('dia-actual'); if (diaActual) { const y = diaActual.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({top: y, behavior: 'smooth'}); } }, 150);
}

function renderMealRow(label, data) {
    if (!data || !data.nombre) return `<div class="meal-row"><span class="meal-label">${label}</span><div class="meal-text">---</div></div>`;
    const recetaSafe = data.receta ? data.receta.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
    const nombreSafe = data.nombre.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const clickAttr = data.receta ? `class="meal-text meal-clickable" onclick="abrirReceta('${nombreSafe}', '${recetaSafe}')"` : `class="meal-text"`;
    return `<div class="meal-row"><span class="meal-label">${label}</span><div ${clickAttr}>${data.nombre} ${data.receta ? ' ℹ️' : ''}</div></div>`;
}

function toggleSuperMode() { supermarketMode = document.getElementById('super-mode-toggle').checked; renderShopping(); }

function renderShopping() {
    const list = document.getElementById('shopping-list');
    const subtitle = document.getElementById('shopping-subtitle');
    list.innerHTML = '';

    const diffTime = currentViewDate - FECHA_INICIO;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const semanaNum = ((diffWeeks % 4) + 4) % 4 + 1;
    let targetWeeks = [semanaNum];
    if (supermarketMode) { if (semanaNum <= 2) targetWeeks = [1, 2]; else targetWeeks = [3, 4]; subtitle.textContent = `Ingredientes semanas: ${targetWeeks.join(' y ')}`; } else { subtitle.textContent = `Ingredientes semana ${semanaNum}`; }

    const categorias = [
        { id: 'Fruteria', icono: '🥦', titulo: 'Frutería y Verduras' },
        { id: 'Carniceria', icono: '🥩', titulo: 'Carnicería' },
        { id: 'Pescaderia', icono: '🐟', titulo: 'Pescadería' },
        { id: 'Refrigerados', icono: '❄️', titulo: 'Refrigerados y Lácteos' },
        { id: 'Despensa', icono: '🥫', titulo: 'Despensa y Varios' }
    ];

    const inventory = {}; categorias.forEach(cat => inventory[cat.id] = {});
    const filasObjetivo = planificadorData.filter(r => targetWeeks.some(w => r.Semana == w));

    filasObjetivo.forEach(fila => {
        categorias.forEach(cat => {
            if (fila[cat.id]) {
                const items = fila[cat.id].toString().split(',');
                items.forEach(rawItem => {
                    let item = rawItem.trim(); if (!item) return;
                    let key = item.toLowerCase(); let display = item.charAt(0).toUpperCase() + item.slice(1);
                    if (!inventory[cat.id][key]) inventory[cat.id][key] = { name: display, count: 0, origins: [] };
                    inventory[cat.id][key].count++;
                    
                    // 🔥 LÓGICA DE PLATO ACORTADO: Recortamos el plato a 15 letras
                    let platoCorto = fila.Plato ? (fila.Plato.length > 15 ? fila.Plato.substring(0, 15) + "..." : fila.Plato) : "---";
                    inventory[cat.id][key].origins.push(`S${fila.Semana} ${fila.Dia.substring(0,3)}: ${platoCorto}`);
                });
            }
        });
    });

    let hayAlgo = false;
    categorias.forEach(cat => {
        const itemsCategoria = inventory[cat.id];
        const sortedKeys = Object.keys(itemsCategoria).sort();
        if (sortedKeys.length > 0) {
            hayAlgo = true;
            list.innerHTML += `<li style="background:#f4f4f4; border:none; padding:10px 0; margin-top:20px; font-weight:bold; font-size:0.85rem; color:#000;">${cat.icono} ${cat.titulo}</li>`;
            sortedKeys.forEach(key => {
                const data = itemsCategoria[key];
                const id = `shop-${supermarketMode?'super':'w'}-${targetWeeks.join('')}-${key.replace(/\s+/g, '')}`;
                const checked = localStorage.getItem(id) === 'true';
                const detailsHtml = data.origins.map(o => `<span>• ${o}</span>`).join('<br>');
                list.innerHTML += `<li style="border-bottom:1px solid #eee;"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="saveStatus('${id}', this.checked)"><div class="item-content"><label class="item-title" for="${id}">${data.name} <span style="font-weight:normal; color:#555;">(x${data.count})</span></label><small class="item-details">${detailsHtml}</small></div></li>`;
            });
        }
    });
    if (!hayAlgo) list.innerHTML = '<li style="color:#aaa; padding:15px;">No hay ingredientes.</li>';
}

// --- GESTIÓN DE PANTALLA (WAKE LOCK) ---
async function activarPantalla() { if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); console.log("WakeLock Activo"); } catch (err) {} } }
function desactivarPantalla() { if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; console.log("WakeLock Liberado"); }); } }

window.abrirReceta = (plato, receta) => {
    document.getElementById('modal-title').textContent = plato;
    document.getElementById('modal-body').textContent = receta || "Sin instrucciones.";
    document.getElementById('recipe-modal').classList.add('open');
    activarPantalla(); 
};
window.cerrarReceta = () => {
    document.getElementById('recipe-modal').classList.remove('open');
    // Solo desactivamos si NO estamos en la pestaña de compra
    if (document.querySelector('.tab-link.active').innerText !== 'Compra') {
        desactivarPantalla();
    }
};

// --- PESO Y TABS ---
async function enviarPeso() { const input = document.getElementById('weight-input'); const btn = document.getElementById('btn-save-weight'); const msg = document.getElementById('weight-msg'); const peso = parseFloat(input.value); if (!peso || peso <= 0) { msg.textContent = "Peso incorrecto"; return; } btn.disabled = true; btn.textContent = "..."; msg.textContent = "Guardando..."; try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ accion: 'guardar', peso: peso }), headers: { "Content-Type": "text/plain" } }); msg.textContent = "¡Guardado!"; input.value = ''; setTimeout(() => { msg.textContent = ''; }, 3000); cargarHistorialPeso(); } catch (error) { msg.textContent = "Error conexión"; } finally { btn.disabled = false; btn.textContent = "Guardar"; } }
async function cargarHistorialPeso() { try { const res = await fetch(`${SCRIPT_URL}?accion=leer`); const json = await res.json(); if (json.datos && json.datos.length > 0) { actualizarKPIs(json.datos); dibujarGrafico(json.datos); } } catch (e) { console.error("Error peso", e); } }
function actualizarKPIs(datos) { const actual = datos[datos.length - 1].peso; document.getElementById('last-weight').textContent = actual + " kg"; if (datos.length > 1) { const previo = datos[datos.length - 2].peso; const diff = actual - previo; const icon = diff < 0 ? '📉' : (diff > 0 ? '📈' : '➡️'); document.getElementById('weight-trend').textContent = icon + " " + diff.toFixed(1); document.getElementById('weight-trend').style.color = diff < 0 ? '#2ecc71' : '#e74c3c'; } }
function dibujarGrafico(historial) { const dataArray = [['Fecha', 'Peso']]; historial.forEach(reg => dataArray.push([reg.fecha, parseFloat(reg.peso)])); const data = google.visualization.arrayToDataTable(dataArray); const options = { curveType: 'function', legend: { position: 'none' }, colors: ['#000'], lineWidth: 3, pointSize: 5, vAxis: { gridlines: { color: '#f0f0f0' } }, hAxis: { textStyle: { color: '#999', fontSize: 10 } }, chartArea: { width: '85%', height: '80%' } }; const chart = new google.visualization.LineChart(document.getElementById('chart_div')); chart.draw(data, options); }

window.saveStatus = (id, state) => { localStorage.setItem(id, state); };

window.showTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    const tab = document.getElementById(name + '-view');
    tab.classList.add('active');
    
    // Marcar botón activo
    event.currentTarget.classList.add('active');

    // 🟢 GESTIÓN WAKE LOCK SEGÚN PESTAÑA
    if (name === 'shopping') {
        activarPantalla(); // Mantener encendida en la lista del súper
    } else {
        desactivarPantalla(); // Dejar que se apague en Menú/Peso para ahorrar
    }

    if (name === 'weight') cargarHistorialPeso();
};
