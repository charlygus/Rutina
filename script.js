let allData = [];
let currentWeek = 3; 
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

window.onload = fetchData;

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        // Detector de separador y limpiador de comillas de Google
        const delimiter = lines[0].includes(';') ? ';' : ',';
        
        allData = lines.map(line => {
            // Esta regex separa por el delimitador pero ignora los que están dentro de comillas ""
            const regex = new RegExp(`\\s*${delimiter}\\s*(?=(?:[^"]*"[^"]*")*[^"]*$)`);
            return line.split(regex).map(cell => cell.replace(/^["']|["']$/g, '').trim());
        });

        // Mapeamos los datos para usarlos por NOMBRE de columna, no por número
        allData = allData.map(r => ({
            semana: r[0], dia: r[1], momento: r[2], plato: r[3], receta: r[4],
            carniceria: r[5], pescaderia: r[6], fruteria: r[7], refrigerados: r[8], despensa: r[9]
        }));

        renderApp();
    } catch (e) {
        console.error("Error cargando datos:", e);
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    // Filtramos por semana y quitamos la cabecera
    const weekRows = allData.filter(r => r.semana == currentWeek && r.dia.toLowerCase() !== 'dia');
    const days = [...new Set(weekRows.map(r => r.dia))];

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r.dia === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        ["Desayuno", "Comida", "Cena"].forEach(m => {
            const row = dayRows.find(r => r.momento === m);
            if (row && row.plato) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid #eee; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${m.charAt(0)}:</strong> ${row.plato}</span>
                    <button class="btn-mini" style="background:#000; color:#fff; border:none; padding:4px 8px; border-radius:5px; font-size:0.7rem;">VER</button>
                </div>`;
            }
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const dayRows = allData.filter(r => r.semana == currentWeek && r.dia === day);
    document.getElementById('recipe-day-title').innerText = day;
    
    const d = dayRows.find(r => r.momento === 'Desayuno') || {};
    const c = dayRows.find(r => r.momento === 'Comida') || {};
    const n = dayRows.find(r => r.momento === 'Cena') || {};

    document.getElementById('recipe-breakfast-name').innerText = d.plato || "-";
    document.getElementById('recipe-breakfast-steps').innerText = d.receta || "Sin pasos";
    
    document.getElementById('recipe-lunch-name').innerText = c.plato || "-";
    document.getElementById('recipe-lunch-steps').innerText = c.receta || "Sin pasos";
    
    document.getElementById('recipe-dinner-name').innerText = n.plato || "-";
    document.getElementById('recipe-dinner-steps').innerText = n.receta || "Sin pasos";

    document.getElementById('recipe-view').classList.add('active');
}

function renderShopping() {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode')?.checked;

    const pasillos = [
        { key: 'carniceria', label: "🥩 Carnicería" },
        { key: 'pescaderia', label: "🐟 Pescadería" },
        { key: 'fruteria', label: "🥦 Frutería" },
        { key: 'refrigerados', label: "❄️ Refrigerados" },
        { key: 'despensa', label: "🥫 Despensa" }
    ];

    let rows = isSuper 
        ? allData.filter(r => (r.semana == 3 || r.semana == 4) && r.dia.toLowerCase() !== 'dia') 
        : allData.filter(r => r.semana == currentWeek && r.dia.toLowerCase() !== 'dia');

    pasillos.forEach(p => {
        let items = rows.filter(r => r[p.key] && r[p.key] !== "");
        
        if (items.length > 0) {
            const h = document.createElement('h4');
            h.innerText = p.label;
            h.style = "margin:20px 0 8px 0; font-size:0.75rem; color:#888; text-transform:uppercase;";
            list.appendChild(h);
            
            items.forEach((item, i) => {
                const id = `chk-${item.semana}-${p.key}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:12px;";
                li.innerHTML = `
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                    <label for="${id}">${isSuper ? `<small style="color:blue">S${item.semana}</small> ` : ''}${item[p.key]}</label>
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

function renderApp() {
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

function closeRecipe() { document.getElementById('recipe-view').classList.remove('active'); }

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}
