// ✅ TUS DATOS MAESTROS
const SHEET_ID = '1xHYqCb5gNeQBc_wUEfs7fpdtHdI9nuzEUhHVV76Hf94'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDnRSmvkcpP6gSn5A7BeUkBqD0puV3Dtro_FvXapt3vkGDRKfNpy61KQSiSDyBpXEWpw/exec';
const FECHA_INICIO = new Date("2026-01-12T00:00:00"); 

let planificadorData = [];
let currentViewDate = new Date();
let supermarketMode = false;
let touchStartX = 0, touchEndX = 0, wakeLock = null;

// --- GOOGLE CHARTS ELIMINADO ---
// En su lugar, cargamos el historial directamente al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    currentViewDate = getMonday(new Date());
    await loadData();
    // Cargar peso en segundo plano si la pestaña activa es peso, si no, esperar
    if(document.getElementById('weight-view').classList.contains('active')) {
        cargarHistorialPeso();
    }
    
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
    const menuContainer = document.getElementById('menu-view');
    menuContainer.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    menuContainer.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, {passive: true});
});

function handleSwipe() { if (touchEndX < touchStartX - 50) changeWeek(1); if (touchEndX > touchStartX + 50) changeWeek(-1); }
function getMonday(d) { d = new Date(d); let day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1); d.setDate(diff); d.setHours(0,0,0,0); return d; }
function formatDate(date) { return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''); }

async function loadData() {
    try {
        const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/MENÚ`);
        const rawData = await res.json();
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
        renderWeek(); renderShopping();
    } catch (e) { console.error(e); } finally { setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 500); }
}

function changeWeek(dir) {
    currentViewDate.setDate(currentViewDate.getDate() + (dir * 7));
    supermarketMode = false; document.getElementById('super-mode-toggle').checked = false;
    renderWeek(); renderShopping();
}

function renderWeek() {
    const diffWeeks = Math.floor((currentViewDate - FECHA_INICIO) / (7 * 24 * 60 * 60 * 1000));
    const semanaNum = diffWeeks + 1;
    
    const hoyReal = new Date(); hoyReal.setHours(0,0,0,0);
    const esSemanaActual = currentViewDate.getTime() === getMonday(new Date()).getTime();
    document.getElementById('btn-back-today').style.display = esSemanaActual ? 'none' : 'block';

    let finSemana = new Date(currentViewDate); finSemana.setDate(finSemana.getDate() + 6);
    document.getElementById('current-week-label').innerHTML = `Semana ${semanaNum}<br><span style="font-size:0.7em; font-weight:normal;">${formatDate(currentViewDate)} - ${formatDate(finSemana)}</span>`;
    
    const container = document.getElementById('days-container'); container.innerHTML = '';
    const filasSemana = planificadorData.filter(r => r.Semana == semanaNum);
    
    if (filasSemana.length === 0) { container.innerHTML = '<p style="text-align:center; padding:40px; color:#999;">No hay datos para esta semana en el Excel.</p>'; return; }

    const diasAgrupados = {};
    const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    filasSemana.forEach(f => {
        let d = f.Dia.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!diasAgrupados[d]) diasAgrupados[d] = {};
        diasAgrupados[d][f.Momento] = { nombre: f.Plato, receta: f.Receta };
    });

    ordenDias.forEach((nombreDia, idx) => {
        let dLimpio = nombreDia.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let platos = diasAgrupados[dLimpio];
        let fechaT = new Date(currentViewDate); fechaT.setDate(fechaT.getDate() + idx);
        const esHoy = fechaT.getTime() === hoyReal.getTime();

        if (platos) {
            let txtManana = "";
            if (esHoy) {
                let sManana = (idx === 6) ? semanaNum + 1 : semanaNum;
                let dManana = ordenDias[(idx + 1) % 7];
                let fManana = planificadorData.find(r => r.Semana == sManana && r.Dia == dManana && r.Momento == "Comida");
                if (fManana) txtManana = `<div class="tomorrow-preview">🔔 Mañana toca: ${fManana.Plato}</div>`;
            }

            container.innerHTML += `<div class="day-item ${esHoy ? 'today' : ''}" ${esHoy ? 'id="dia-actual"' : ''}><div class="day-header" style="display:flex; justify-content:space-between;"><span>${nombreDia}</span><span style="color:#888; font-weight:normal;">${formatDate(fechaT)}</span></div><div class="day-body">${renderMealRow('Desayuno', platos.Desayuno)}${renderMealRow('Comida', platos.Comida)}${renderMealRow('Cena', platos.Cena)}${txtManana}</div></div>`;
        }
    });
    if (esSemanaActual) setTimeout(() => { const el = document.getElementById('dia-actual'); if(el) window.scrollTo({top: el.offsetTop - 90, behavior: 'smooth'}); }, 150);
}

function renderMealRow(label, data) {
    if (!data || !data.nombre) return `<div class="meal-row"><span class="meal-label">${label}</span><div class="meal-text">---</div></div>`;
    const recSafe = data.receta ? data.receta.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
    const nomSafe = data.nombre.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    return `<div class="meal-row"><span class="meal-label">${label}</span><div class="meal-text ${data.receta ? 'meal-clickable' : ''}" ${data.receta ? `onclick="abrirReceta('${nomSafe}', '${recSafe}')"` : ''}>${data.nombre} ${data.receta ? 'ℹ️' : ''}</div></div>`;
}

function toggleSuperMode() { supermarketMode = document.getElementById('super-mode-toggle').checked; renderShopping(); }

// --- LÓGICA DE COMPRA ---
function renderShopping() {
    const list = document.getElementById('shopping-list');
    const subtitle = document.getElementById('shopping-subtitle');
    const diffWeeks = Math.floor((currentViewDate - FECHA_INICIO) / (7 * 24 * 60 * 60 * 1000));
    const semanaActual = diffWeeks + 1;
    
    const semanasReales = planificadorData
        .filter(r => r.Plato && r.Plato.trim().length > 1)
        .map(r => parseInt(r.Semana))
        .filter(s => !isNaN(s));
    
    const maxSemanaEscrita = semanasReales.length > 0 ? Math.max(...semanasReales) : 1;

    let targets = [semanaActual];
    if (supermarketMode) {
        if (semanaActual < maxSemanaEscrita) {
            targets = [semanaActual, semanaActual + 1];
            subtitle.textContent = `Ingredientes semanas ${semanaActual} y ${semanaActual + 1}`;
            subtitle.style.color = "#757575";
        } else if (semanaActual > 1) {
            targets = [semanaActual - 1, semanaActual];
            subtitle.innerHTML = `⚠️ Fin del plan. Combinando semanas <b>${semanaActual - 1} y ${semanaActual}</b>`;
            subtitle.style.color = "#e67e22";
        } else {
            targets = [semanaActual];
            subtitle.textContent = `Solo hay datos de la semana ${semanaActual}`;
        }
    } else {
        subtitle.textContent = `Ingredientes semana ${semanaActual}`;
        subtitle.style.color = "#757575";
    }
    
    list.innerHTML = '';
    const categorias = [
        {id:'Fruteria', ico:'🥦', tit:'Frutería'}, 
        {id:'Carniceria', ico:'🥩', tit:'Carnicería'}, 
        {id:'Pescaderia', ico:'🐟', tit:'Pescadería'}, 
        {id:'Refrigerados', ico:'❄️', tit:'Refrigerados'}, 
        {id:'Despensa', ico:'🥫', tit:'Despensa'}
    ];
    
    const inventory = {}; categorias.forEach(c => inventory[c.id] = {});
    
    const filasObjetivo = planificadorData.filter(r => targets.includes(parseInt(r.Semana)));

    filasObjetivo.forEach(fila => {
        categorias.forEach(cat => {
            if (fila[cat.id]) {
                fila[cat.id].split(',').forEach(item => {
                    let raw = item.trim(); if (!raw) return;
                    let k = raw.toLowerCase();
                    if (!inventory[cat.id][k]) inventory[cat.id][k] = { 
                        name: raw.charAt(0).toUpperCase() + raw.slice(1), 
                        count: 0, 
                        origins: [] 
                    };
                    inventory[cat.id][k].count++;
                    inventory[cat.id][k].origins.push(`S${fila.Semana} ${fila.Dia.substring(0,3)}: ${fila.Plato || '---'}`);
                });
            }
        });
    });

    let hayAlgo = false;
    categorias.forEach(cat => {
        const items = Object.keys(inventory[cat.id]).sort();
        if (items.length > 0) {
            hayAlgo = true;
            list.innerHTML += `<li style="background:#f4f4f4; border:none; padding:10px 0; margin-top:20px; font-weight:bold; font-size:0.85rem; color:#000;">${cat.ico} ${cat.tit}</li>`;
            items.forEach(k => {
                const d = inventory[cat.id][k];
                const id = `shop-${k.replace(/\s+/g, '')}`;
                const checked = localStorage.getItem(id) === 'true';
                list.innerHTML += `
                    <li style="border-bottom:1px solid #eee;">
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="saveStatus('${id}', this.checked)">
                        <div class="item-content">
                            <label class="item-title" for="${id}">${d.name} (x${d.count})</label>
                            <small class="item-details">${d.origins.map(o => `• ${o}`).join('<br>')}</small>
                        </div>
                    </li>`;
            });
        }
    });

    if (!hayAlgo) list.innerHTML = '<li style="color:#aaa; padding:15px;">No hay ingredientes.</li>';
}

async function activarPantalla() { if ('wakeLock' in navigator) try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} }
function desactivarPantalla() { if (wakeLock !== null) wakeLock.release().then(() => wakeLock = null); }

window.abrirReceta = (p, r) => { document.getElementById('modal-title').textContent = p; document.getElementById('modal-body').textContent = r; document.getElementById('recipe-modal').classList.add('open'); activarPantalla(); };
window.cerrarReceta = () => { document.getElementById('recipe-modal').classList.remove('open'); if (document.querySelector('.tab-link.active').innerText !== 'Compra') desactivarPantalla(); };
window.backToToday = () => { currentViewDate = getMonday(new Date()); renderWeek(); renderShopping(); };
window.saveStatus = (id, s) => localStorage.setItem(id, s);
window.showTab = (n) => {
    document.querySelectorAll('.tab-content, .tab-link').forEach(el => el.classList.remove('active'));
    document.getElementById(n + '-view').classList.add('active');
    event.currentTarget.classList.add('active');
    if (n === 'shopping') activarPantalla(); else desactivarPantalla();
    // Si mostramos peso, aseguramos que los datos estén frescos
    if (n === 'weight') cargarHistorialPeso();
};

async function enviarPeso() { 
    const i = document.getElementById('weight-input'), b = document.getElementById('btn-save-weight'), m = document.getElementById('weight-msg'), p = parseFloat(i.value);
    if (!p || p <= 0) { m.textContent = "VALOR INVÁLIDO"; return; }
    b.disabled = true; m.textContent = "PROCESANDO...";
    try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ accion: 'guardar', peso: p }), headers: { "Content-Type": "text/plain" } }); m.textContent = "DATOS GUARDADOS"; i.value = ''; setTimeout(() => m.textContent = '', 3000); cargarHistorialPeso(); } catch (e) { m.textContent = "ERROR CONEXIÓN"; } finally { b.disabled = false; }
}

// --- NUEVA FUNCIÓN DE CARGA DE PESO (SIN GOOGLE CHARTS) ---
async function cargarHistorialPeso() {
    const chartContainer = document.getElementById('chart_div');
    // Indicador de carga sutil
    chartContainer.innerHTML = '<div style="text-align:center; color:#999; font-size:0.8rem; padding-top:100px;">Cargando datos...</div>';

    try {
        const res = await fetch(`${SCRIPT_URL}?accion=leer`);
        const json = await res.json();
        
        if (json.datos && json.datos.length > 0) {
            // Usamos solo los últimos 7 datos para que las barras se vean bien en móvil
            const ultimosDatos = json.datos.slice(-7);
            const len = ultimosDatos.length;
            const actualEl = ultimosDatos[len - 1];
            const actualVal = parseFloat(actualEl.weight || actualEl.peso);
            
            // Actualizar KPI principal
            document.getElementById('last-weight').textContent = actualVal.toFixed(1) + " kg";
            
            // --- CÁLCULO DE TENDENCIA ---
            const trendEl = document.getElementById('weight-trend');
            if (len >= 2) {
                const anteriorEl = ultimosDatos[len - 2];
                const anteriorVal = parseFloat(anteriorEl.weight || anteriorEl.peso);
                const diff = actualVal - anteriorVal;
                if (diff > 0) {
                    trendEl.innerHTML = "↑ +" + diff.toFixed(1);
                    trendEl.style.color = "#757575"; 
                } else if (diff < 0) {
                    trendEl.innerHTML = "↓ " + diff.toFixed(1);
                    trendEl.style.color = "#000000"; 
                } else {
                    trendEl.innerHTML = "= 0.0";
                    trendEl.style.color = "#757575";
                }
            } else {
                trendEl.textContent = "---";
                trendEl.style.color = "#000000";
            }

            // --- GENERACIÓN DE BARRAS CSS ---
            // 1. Encontrar min y max de los datos mostrados para la escala
            const pesos = ultimosDatos.map(d => parseFloat(d.weight || d.peso));
            let minWeight = Math.min(...pesos);
            let maxWeight = Math.max(...pesos);
            
            // Dar un pequeño margen (buffer) para que la barra más pequeña no sea 0% altura
            let buffer = (maxWeight - minWeight) * 0.1; 
            if(buffer === 0) buffer = 1; // Si todos pesan igual
            const scaleMin = minWeight - buffer;
            const scaleMax = maxWeight + (buffer * 0.5); // Un poco de aire arriba

            let htmlBarras = '';
            ultimosDatos.forEach(reg => {
                const peso = parseFloat(reg.weight || reg.peso);
                // Cálculo de porcentaje de altura relativo a la escala
                let heightPercent = ((peso - scaleMin) / (scaleMax - scaleMin)) * 100;
                // Asegurar un mínimo visual
                heightPercent = Math.max(heightPercent, 15); 

                // Formatear fecha a DD/MM
                let fStr = reg.fecha;
                if(typeof fStr === 'string') {
                    let parts = fStr.split('/');
                    if(parts.length >= 2) fStr = `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}`;
                }

                htmlBarras += `
                    <div class="bar-wrapper" data-value="${peso.toFixed(1)}">
                        <div class="bar-pill" style="height: ${heightPercent}%;"></div>
                        <span class="bar-label">${fStr}</span>
                    </div>
                `;
            });

            // Inyectar el HTML generado
            chartContainer.innerHTML = htmlBarras;

        } else {
            chartContainer.innerHTML = '<div style="text-align:center; color:#999; padding-top:100px;">Sin datos aún</div>';
        }
    } catch (e) {
        console.error(e);
        chartContainer.innerHTML = '<div style="text-align:center; color:red; padding-top:100px;">Error de carga</div>';
    }
}
