let allData = [];
let currentWeek = 3; 
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    try {
        console.log("Intentando conectar con el Excel...");
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        if (!text || text.length < 10) {
            throw new Error("El Excel parece estar vacío o no publicado correctamente.");
        }

        // --- DETECTOR DE SEPARADORES ---
        // Probamos | primero, luego ; y luego ,
        let lines = text.trim().split(/\r?\n/);
        let separator = '|';
        if (lines[0].split(';').length > lines[0].split('|').length) separator = ';';
        if (lines[0].split(',').length > lines[0].split(';').length) separator = ',';

        allData = lines.map(line => {
            return line.split(separator).map(cell => {
                // Limpiamos comillas dobles y espacios raros
                return cell.replace(/^["']|["']$/g, '').trim();
            });
        });

        console.log("Separador detectado:", separator);
        console.log("Primera fila de datos:", allData[1]);

        renderApp();
    } catch (e) {
        console.error("ERROR CRÍTICO:", e);
        document.getElementById('days-container').innerHTML = `<div class="day-card" style="color:red">⚠️ Error: ${e.message}. Revisa que el Sheets esté 'Publicado en la Web'.</div>`;
    }
}

// --- FUNCIÓN PARA PINTAR EL MENÚ ---
function renderMenu() {
    const container = document.getElementById('days-container');
    if (!container) return;
    container.innerHTML = '';

    // Buscamos las filas de la semana actual
    // La columna 0 es la SEMANA
    const weekRows = allData.filter(row => row[0] == currentWeek);
    
    // Obtenemos los días (Columna 1) sin repetir y que no sean el encabezado
    const days = [...new Set(weekRows.map(row => row[1]))].filter(d => d && d.toLowerCase() !== 'dia' && d !== '');

    if (days.length === 0) {
        container.innerHTML = `<div class="day-card">❌ No hay datos para la Semana ${currentWeek}.<br><small>Verifica que la Columna A de tu Excel tenga el número ${currentWeek}.</small></div>`;
        return;
    }

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3 style="margin-top:0">${day}</h3>`;
        dayRows.forEach(row => {
            const momento = row[2]; // Comida/Cena/Desayuno
            const plato = row[3];   // Nombre del plato
            
            if (plato && plato !== 'plato') {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid #eee; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${momento}:</strong> ${plato}</span>
                    <button class="btn-mini" style="background:#000; color:#fff; border:none; padding:4px 8px; border-radius:5px; font-size:0.7rem;">Ver</button>
                </div>`;
            }
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

// --- RECETAS ---
function openRecipe(day) {
    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    const view = document.getElementById('recipe-view');
    
    document.getElementById('recipe-day-title').innerText = day;
    
    // Rellenamos Comida (row[2] es momento, row[3] plato, row[4] receta)
    const comida = dayRows.find(r => r[2] === 'Comida') || {3: 'Libre', 4: ''};
    const cena = dayRows.find(r => r[2] === 'Cena') || {3: 'Libre', 4: ''};

    document.getElementById('recipe-lunch-name').innerText = comida[3];
    document.getElementById('recipe-lunch-steps').innerText = comida[4];
    document.getElementById('recipe-dinner-name').innerText = cena[3];
    document.getElementById('recipe-dinner-steps').innerText = cena[4];

    view.classList.add('active');
    view.style.display = 'block';
}

function closeRecipe() {
    const view = document.getElementById('recipe-view');
    view.classList.remove('active');
    view.style.display = 'none';
}

// --- COMPRA ---
function renderShopping() {
    const list = document.getElementById('shopping-list');
    if (!list) return;
    list.innerHTML = '';

    const isSuper = document.getElementById('supermarket-mode')?.checked;
    
    // Mapeo de columnas: 5:Carn, 6:Pesc, 7:Frut, 8:Refri, 9:Desp
    const pasillos = [
        { idx: 5, label: "🥩 Carnicería" },
        { idx: 6, label: "🐟 Pescadería" },
        { idx: 7, label: "🥦 Frutería" },
        { idx: 8, label: "❄️ Refrigerados" },
        { idx: 9, label: "🥫 Despensa" }
    ];

    const rows = isSuper 
        ? allData.filter(r => r[0] == 3 || r[0] == 4) 
        : allData.filter(r => r[0] == currentWeek);

    pasillos.forEach(p => {
        const items = rows.filter(r => r[p.idx] && r[p.idx] !== "" && r[p.idx] !== p.label.split(' ')[1].toLowerCase());
        
        if (items.length > 0) {
            const h = document.createElement('h4');
            h.innerText = p.label;
            h.style = "margin-top:20px; font-size:0.75rem; color:#888; text-transform:uppercase;";
            list.appendChild(h);

            items.forEach((item, i) => {
                const id = `chk-${item[0]}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; padding:8px 0; border-bottom:1px solid #eee; display:flex; align-items:center; gap:10px;";
                li.innerHTML = `
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                    <label for="${id}">${isSuper ? `<small style="color:blue">S${item[0]}</small> ` : ''}${item[p.idx]}</label>
                `;
                list.appendChild(li);
            });
        }
    });
}

// --- NAVEGACIÓN ---
function changeWeek(delta) {
    currentWeek = Math.max(1, currentWeek + delta);
    renderApp();
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}

function renderApp() {
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

// Iniciamos la carga
fetchData();
