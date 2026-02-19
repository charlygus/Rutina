// ✅ TUS DATOS MAESTROS
const SHEET_ID = '1xHYqCb5gNeQBc_wUEfs7fpdtHdI9nuzEUhHVV76Hf94'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDnRSmvkcpP6gSn5A7BeUkBqD0puV3Dtro_FvXapt3vkGDRKfNpy61KQSiSDyBpXEWpw/exec';
const FECHA_INICIO = new Date("2026-01-12T00:00:00"); 

let planificadorData = [];
let currentViewDate = new Date();
let supermarketMode = false;
let touchStartX = 0, touchEndX = 0, wakeLock = null;

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

// --- LÓGICA DE COMPRA CORREGIDA ---
function renderShopping() {
    const list = document.getElementById('shopping-list');
    const subtitle = document.getElementById('shopping-subtitle');
    const diffWeeks = Math.floor((currentViewDate - FECHA_INICIO) / (7 * 24 * 60 * 60 * 1000));
    const semanaActual = diffWeeks + 1;
    
    // 🔥 CORRECCIÓN: Filtramos solo las semanas que tienen PLATOS rellenos.
    // Esto evita que filas vacías en el Excel cuenten como "semanas futuras".
    const semanasReales = planificadorData
        .filter(r => r.Plato && r.Plato.trim().length > 1)
        .map(r => parseInt(r.Semana))
        .filter(s => !isNaN(s));
    
    // Buscamos la semana más alta REAL
    const maxSemanaEscrita = semanasReales.length > 0 ? Math.max(...semanasReales) : 1;

    let targets = [semanaActual];
    if (supermarketMode) {
        if (semanaActual < maxSemanaEscrita) {
            // Hay semana siguiente disponible
            targets = [semanaActual, semanaActual + 1];
            subtitle.textContent = `Ingredientes semanas ${semanaActual} y ${semanaActual + 1}`;
            subtitle.style.color = "#757575"; // Color normal
        } else if (semanaActual > 1) {
            // NO hay semana siguiente -> Combinamos con la anterior
            targets = [semanaActual - 1, semanaActual];
            // ⚠️ Aviso visual para que sepas qué está pasando
            subtitle.innerHTML = `⚠️ Fin del plan. Combinando semanas <b>${semanaActual - 1} y ${semanaActual}</b>`;
            subtitle.style.color = "#e67e22"; // Color naranja de aviso
        } else {
            // Solo existe la semana 1
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
    if (n === 'weight') cargarHistorialPeso();
};

async function enviarPeso() { 
    const i = document.getElementById('weight-input'), b = document.getElementById('btn-save-weight'), m = document.getElementById('weight-msg'), p = parseFloat(i.value);
    if (!p || p <= 0) { m.textContent = "VALOR INVÁLIDO"; return; }
    b.disabled = true; m.textContent = "PROCESANDO...";
    try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ accion: 'guardar', peso: p }), headers: { "Content-Type": "text/plain" } }); m.textContent = "DATOS GUARDADOS"; i.value = ''; setTimeout(() => m.textContent = '', 3000); cargarHistorialPeso(); } catch (e) { m.textContent = "ERROR CONEXIÓN"; } finally { b.disabled = false; }
}

async function cargarHistorialPeso() {
    try {
        const res = await fetch(`${SCRIPT_URL}?accion=leer`);
        const json = await res.json();
        if (json.datos && json.datos.length > 0) {
            const len = json.datos.length;
            const actual = parseFloat(json.datos[len - 1].weight || json.datos[len - 1].peso);
            document.getElementById('last-weight').textContent = actual.toFixed(1) + " kg";
            
            // --- CÁLCULO DE TENDENCIA ---
            const trendEl = document.getElementById('weight-trend');
            if (len >= 2) {
                const anterior = parseFloat(json.datos[len - 2].weight || json.datos[len - 2].peso);
                const diff = actual - anterior;
                if (diff > 0) {
                    trendEl.textContent = "↑ +" + diff.toFixed(1);
                    trendEl.style.color = "#ff3b30"; // Subida (Rojo)
                } else if (diff < 0) {
                    trendEl.textContent = "↓ " + diff.toFixed(1);
                    trendEl.style.color = "#00ff41"; // Bajada (Verde Matrix)
                } else {
                    trendEl.textContent = "= 0.0";
                    trendEl.style.color = "#888888"; // Igual (Gris)
                }
            } else {
                trendEl.textContent = "---";
                trendEl.style.color = "#00ff41";
            }

            // --- GRÁFICA DIGITAL MEJORADA ---
            const data = google.visualization.arrayToDataTable([['Fecha', 'Peso'], ...json.datos.map(reg => {
                // Formateamos un poco la fecha si es muy larga
                let fStr = reg.fecha;
                if(typeof fStr === 'string' && fStr.includes('/')) {
                    let parts = fStr.split('/');
                    if(parts.length >= 2) fStr = `${parts[0]}/${parts[1]}`;
                }
                return [fStr, parseFloat(reg.weight || reg.peso)];
            })]);
            
            new google.visualization.LineChart(document.getElementById('chart_div')).draw(data, { 
                legend: 'none', 
                colors: ['#00ff41'], // Color neón
                backgroundColor: 'transparent',
                pointSize: 5,        // Puntos visibles
                lineWidth: 2,        // Línea recta en vez de curva
                chartArea: { width: '85%', height: '65%', top: 15 }, // Más espacio abajo para textos
                hAxis: { 
                    textStyle: { color: '#888', fontName: 'Roboto Mono', fontSize: 10 },
                    slantedText: true, 
                    slantedTextAngle: 45, // Texto inclinado para que quepan bien
                    gridlines: { color: 'transparent' }
                },
                vAxis: { 
                    textStyle: { color: '#888', fontName: 'Roboto Mono', fontSize: 11 },
                    gridlines: { color: '#222' },
                    minorGridlines: { color: 'transparent' }
                },
                tooltip: { textStyle: { fontName: 'Roboto Mono' } }
            });
        }
    } catch (e) {}
}
