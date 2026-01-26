let allData = [];
let currentWeek = 3; 
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    const container = document.getElementById('days-container');
    container.innerHTML = "<p style='text-align:center;'>⏳ Conectando con Google Sheets...</p>";

    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error("No se pudo acceder a la URL del Excel.");
        
        const text = await response.text();
        // Limpiamos espacios en blanco locos y dividimos por filas
        const rows = text.trim().split(/\r?\n/);

        // DETECTOR DE SEPARADOR (Muy importante)
        const firstLine = rows[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        console.log("Separador detectado:", delimiter);

        // Procesamos todas las filas
        allData = rows.map(row => {
            return row.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim());
        });

        console.log("Datos cargados correctamente. Filas totales:", allData.length);
        console.table(allData.slice(0, 5)); // Esto lo verás en la consola F12

        renderApp();
    } catch (e) {
        console.error("Error:", e);
        container.innerHTML = `<p style='color:red; padding:20px;'>❌ Error: ${e.message}<br><br>Asegúrate de que el Excel esté "Publicado en la web" como CSV.</p>`;
    }
}

function renderApp() {
    const label = document.getElementById('current-week-label');
    if (label) label.innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

// --- MENÚ ---
function renderMenu() {
    const container = document.getElementById('days-container');
    container.innerHTML = '';

    // Filtramos: Semana coincide Y la columna 1 (Día) no está vacía Y no es la cabecera
    const weekRows = allData.filter(r => r[0] == currentWeek && r[1] && r[1].toLowerCase() !== 'dia');

    if (weekRows.length === 0) {
        container.innerHTML = `<p style='text-align:center; padding:20px;'>No hay platos para la Semana ${currentWeek}.<br><small>Verifica que la columna A tenga el número ${currentWeek}.</small></p>`;
        return;
    }

    // Obtenemos días únicos en esa semana
    const days = [...new Set(weekRows.map(r => r[1]))];

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        
        // Buscamos los 3 momentos
        ["Desayuno", "Comida", "Cena"].forEach(m => {
            const row = dayRows.find(r => r[2] === m);
            if (row && row[3]) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid #eee; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${m.charAt(0)}:</strong> ${row[3]}</span>
                    <button class="btn-mini" style="background:#000; color:#fff; border:none; padding:4px 8px; border-radius:5px; font-size:0.7rem;">RECETA</button>
                </div>`;
            }
        });

        if (dayRows[0][3] === 'LIBRE') {
            html = `<h3>${day}</h3><p style="color:#999; font-style:italic;">✨ Día Libre</p>`;
        }
        
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    document.getElementById('recipe-day-title').innerText = day;
    
    const d = dayRows.find(r => r[2] === 'Desayuno') || ["","","","-",""];
    const c = dayRows.find(r => r[2] === 'Comida') || ["","","","-",""];
    const n = dayRows.find(r => r[2] === 'Cena') || ["","","","-",""];

    document.getElementById('recipe-lunch-name').innerHTML = `🍱 ${c[3]}<br><small>☕ Desayuno: ${d[3]}</small>`;
    document.getElementById('recipe-lunch-steps').innerHTML = `<strong>Comida:</strong> ${c[4] || 'Sin pasos'}<br><br><strong>Desayuno:</strong> ${d[4] || 'Sin pasos'}`;
    
    document.getElementById('recipe-dinner-name').innerText = n[3];
    document.getElementById('recipe-dinner-steps').innerText = n[4] || "Sin pasos";

    document.getElementById('recipe-view').classList.add('active');
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
}

// --- COMPRA ---
function renderShopping() {
    const list = document.getElementById('shopping-list');
    if (!list) return;
    list.innerHTML = '';
    
    const isSuper = document.getElementById('supermarket-mode')?.checked;
    
    // Mapeo exacto de tus 10 columnas:
    // 0:Sem, 1:Dia, 2:Mom, 3:Plato, 4:Receta, 5:Carn, 6:Pesc, 7:Frut, 8:Refri, 9:Desp
    const pasillos = [
        { idx: 5, label: "🥩 Carnicería" },
        { idx: 6, label: "🐟 Pescadería" },
        { idx: 7, label: "🥦 Frutería" },
        { idx: 8, label: "❄️ Refrigerados" },
        { idx: 9, label: "🥫 Despensa" }
    ];

    let rows = isSuper 
        ? allData.filter(r => (r[0] == 3 || r[0] == 4) && r[1].toLowerCase() !== 'dia') 
        : allData.filter(r => r[0] == currentWeek && r[1].toLowerCase() !== 'dia');

    pasillos.forEach(p => {
        let items = rows.filter(r => r[p.idx] && r[p.idx] !== "");
        
        if (items.length > 0) {
            const h = document.createElement('h4');
            h.innerText = p.label;
            h.style = "margin:15px 0 5px 0; font-size:0.75rem; color:#888; text-transform:uppercase;";
            list.appendChild(h);
            
            items.forEach((item, i) => {
                const id = `chk-${item[0]}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; padding:8px 0; border-bottom:1px solid #eee; display:flex; align-items:center; gap:10px;";
                li.innerHTML = `
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                    <label for="${id}" style="font-size:0.95rem;">${isSuper ? `<small style="color:blue">S${item[0]}</small> ` : ''}${item[p.idx]}</label>
                `;
                list.appendChild(li);
            });
        }
    });
}

function changeWeek(d) {
    currentWeek = Math.max(1, currentWeek + d);
    renderApp();
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    const target = document.getElementById(`${tab}-view`);
    if(target) target.classList.add('active');
    if(event) event.currentTarget.classList.add('active');
}

// Arrancar al cargar
window.onload = fetchData;
