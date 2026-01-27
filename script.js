// ✅ TUS DATOS CORRECTOS
const SHEET_ID = '1xHYqCb5gNeQBc_wUEfs7fpdtHdI9nuzEUhHVV76Hf94'; 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDnRSmvkcpP6gSn5A7BeUkBqD0puV3Dtro_FvXapt3vkGDRKfNpy61KQSiSDyBpXEWpw/exec';

let planificadorData = [];
let currentWeek = 1;
let supermarketMode = false;

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(cargarHistorialPeso);

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

// --- FUNCIÓN INTELIGENTE DE CARGA ---
async function loadData() {
    const label = document.getElementById('current-week-label');
    try {
        const nombrePestana = encodeURIComponent("MENÚ");
        const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/${nombrePestana}`);
        const rawData = await res.json();
        
        if (!Array.isArray(rawData) || rawData.error) {
            console.error("Respuesta:", rawData);
            throw new Error("No se pudo leer la hoja MENÚ.");
        }

        // 🔥 NORMALIZADOR DE COLUMNAS (La Magia)
        // Esto convierte 'semana', 'SEMANA', 'Día', 'dia '... todo al formato correcto.
        planificadorData = rawData.map(row => {
            const cleanRow = {};
            Object.keys(row).forEach(key => {
                // Quitamos tildes, espacios y ponemos minúsculas para comparar
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
                else cleanRow[key] = row[key]; // Otros campos
            });
            return cleanRow;
        });

        // Debug: Chivato para saber qué ha leído
        console.log("Datos procesados:", planificadorData[0]);

        renderWeek(currentWeek);
        renderShopping();
    } catch (e) {
        label.textContent = "Error Datos";
        console.error(e);
        alert("Error: Revisa que la pestaña se llame MENÚ y tenga datos.");
    }
}

function changeWeek(dir) {
    let next = currentWeek + dir;
    // Usamos '==' para que le de igual si es texto "1" o número 1
    if (planificadorData.some(r => r.Semana == next)) {
        currentWeek = next;
        renderWeek(currentWeek);
        supermarketMode = false; 
        const toggle = document.getElementById('super-mode-toggle');
        if(toggle) toggle.checked = false;
        renderShopping();
    }
}

function renderWeek(num) {
    document.getElementById('current-week-label').textContent = `Semana ${num}`;
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    // Filtro flexible (==)
    const filasSemana = planificadorData.filter(r => r.Semana == num);
    
    if (filasSemana.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">No hay datos para la Semana ${num}</p>`;
        return;
    }

    const diasAgrupados = {};
    const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    filasSemana.forEach(fila => {
        if (!fila.Dia) return;
        // Normalizamos el día para agrupar aunque pongas "lunes "
        const diaLimpio = fila.Dia.trim().charAt(0).toUpperCase() + fila.Dia.trim().slice(1).toLowerCase();
        // Mapeo manual por si las tildes fallan
        let diaKey = diaLimpio;
        if(diaLimpio === "Miercoles") diaKey = "Miércoles";
        if(diaLimpio === "Sabado") diaKey = "Sábado";

        if (!diasAgrupados[diaKey]) diasAgrupados[diaKey] = {};
        
        // Normalizar momento
        const momento = (fila.Momento || "").toLowerCase();
        if(momento.includes("desayuno")) diasAgrupados[diaKey].Desayuno = fila.Plato;
        if(momento.includes("comida")) diasAgrupados[diaKey].Comida = fila.Plato;
        if(momento.includes("cena")) diasAgrupados[diaKey].Cena = fila.Plato;
    });

    ordenDias.forEach(nombreDia => {
        // Buscamos ignorando tildes en la clave por si acaso
        let platos = diasAgrupados[nombreDia];
        
        if (platos) {
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
    
    // Filtro flexible
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

                    if (!inventory[key]) {
                        inventory[key] = { name: display, count: 0, origins: [] };
                    }
                    inventory[key].count++;
                    inventory[key].origins.push(
                        `S${fila.Semana} ${fila.Dia}: ${fila.Momento}`
                    );
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
        // Limitamos visualmente los orígenes para no saturar
        const detailsHtml = data.origins.map(o => `<span>• ${o}</span>`).join('<br>');

        list.innerHTML += `
            <li>
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} 
                       onchange="saveStatus('${id}', this.checked)">
                <div class="item-content">
                    <label class="item-title" for="${id}">
                        ${data.name} <span style="font-weight:normal; color:#555;">(x${data.count})</span>
                    </label>
                    <small class="item-details">${detailsHtml}</small>
                </div>
            </li>`;
    });
}

// --- PESO ---
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
    } catch (error) {
        msg.textContent = "Error conexión"; 
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
