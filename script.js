let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

window.onload = fetchData;

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        allData = lines.map(line => {
            // Este es el "Escudo": solo rompe la línea por ";" que NO estén entre comillas
            const regex = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            return line.split(regex).map(cell => cell.replace(/^["']|["']$/g, '').trim());
        });

        console.log("Datos cargados sin errores de filtrado.");
        renderApp();
    } catch (e) {
        console.error("Error cargando Sheets", e);
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    
    const weekRows = allData.filter(r => r[0] == currentWeek && r[1] && r[1].toLowerCase() !== 'dia');
    const days = [...new Set(weekRows.map(r => r[1]))];

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        const momentos = ["Desayuno", "Comida", "Cena"];
        
        momentos.forEach(m => {
            const found = dayRows.find(r => r[2] === m);
            if (found && found[3]) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid #f2f2f2; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${m.charAt(0)}:</strong> ${found[3]}</span>
                    <button class="btn-mini" style="background:#000; color:#fff; border:none; padding:4px 8px; border-radius:5px; font-size:0.7rem;">VER</button>
                </div>`;
            }
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    document.getElementById('recipe-day-title').innerText = day;
    
    // Mapeo estricto de columnas
    const d = dayRows.find(r => r[2] === 'Desayuno') || ["","","","-",""];
    const c = dayRows.find(r => r[2] === 'Comida') || ["","","","-",""];
    const n = dayRows.find(r => r[2] === 'Cena') || ["","","","-",""];

    document.getElementById('recipe-breakfast-name').innerText = d[3] || "-";
    document.getElementById('recipe-breakfast-steps').innerText = d[4] || "Sin receta";
    
    document.getElementById('recipe-lunch-name').innerText = c[3] || "-";
    document.getElementById('recipe-lunch-steps').innerText = c[4] || "Sin receta";
    
    document.getElementById('recipe-dinner-name').innerText = n[3] || "-";
    document.getElementById('recipe-dinner-steps').innerText = n[4] || "Sin receta";

    document.getElementById('recipe-view').classList.add('active');
}

function renderShopping() {
    const list = document.getElementById('shopping-list');
    if(!list) return;
    list.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode')?.checked;

    // COLUMNAS ESTRICTAS: 5: Carnicería, 6: Pescadería, 7: Frutería, 8: Refrigerados, 9: Despensa
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
        // Aquí está el truco: solo lee la columna p.idx, ignorando la 4 (receta)
        let items = rows.filter(r => r[p.idx] && r[p.idx] !== "");
        
        if (items.length > 0) {
            const h = document.createElement('h4');
            h.innerText = p.label;
            h.style = "margin:20px 0 8px 0; font-size:0.75rem; color:#888; text-transform:uppercase;";
            list.appendChild(h);
            
            items.forEach((item, i) => {
                const id = `chk-${item[0]}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:10px;";
                li.innerHTML = `
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                    <label for="${id}">${isSuper ? `<small style="color:blue">S${item[0]}</small> ` : ''}${item[p.idx]}</label>
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
    const label = document.getElementById('current-week-label');
    if(label) label.innerText = `Semana ${currentWeek}`;
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
