let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

// Forzamos la carga inicial
window.onload = fetchData;

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        // Detector de separador automático
        const delimiter = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
        
        // Procesado ultra-simple para evitar errores de mapeo
        allData = lines.map(line => {
            return line.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim());
        });

        renderApp();
    } catch (e) {
        console.error("Error cargando datos:", e);
        document.getElementById('days-container').innerHTML = "Error al cargar el Excel.";
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Filtrar por semana y quitar cabecera
    const weekRows = allData.filter(r => r[0] == currentWeek && r[1].toLowerCase() !== 'dia');
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
                <div class="meal-row" onclick="openRecipe('${day}')">
                    <span><strong>${m.charAt(0)}:</strong> ${found[3]}</span>
                    <button class="btn-mini">VER</button>
                </div>`;
            }
        });

        // Caso especial Día Libre
        if (dayRows.some(r => r[3] && r[3].includes('LIBRE'))) {
            html = `<h3>${day}</h3><p style="color:#999; font-style:italic;">✨ Día Libre</p>`;
        }
        
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    document.getElementById('recipe-day-title').innerText = day;
    
    // Mapeo: 3 plato, 4 receta
    const d = dayRows.find(r => r[2] === 'Desayuno') || ["","","","-",""];
    const c = dayRows.find(r => r[2] === 'Comida') || ["","","","-",""];
    const n = dayRows.find(r => r[2] === 'Cena') || ["","","","-",""];

    document.getElementById('recipe-breakfast-name').innerText = d[3] || "-";
    document.getElementById('recipe-breakfast-steps').innerText = d[4] || "Sin pasos";
    
    document.getElementById('recipe-lunch-name').innerText = c[3] || "-";
    document.getElementById('recipe-lunch-steps').innerText = c[4] || "Sin pasos";
    
    document.getElementById('recipe-dinner-name').innerText = n[3] || "-";
    document.getElementById('recipe-dinner-steps').innerText = n[4] || "Sin pasos";

    document.getElementById('recipe-view').classList.add('active');
}

function renderShopping() {
    const list = document.getElementById('shopping-list');
    if (!list) return;
    list.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode')?.checked;

    // Pasillos: 5 Carnicería, 6 Pescadería, 7 Frutería, 8 Refrigerados, 9 Despensa
    const pasillos = [
        { idx: 5, label: "🥩 Carnicería", class: "cat-meat" },
        { idx: 6, label: "🐟 Pescadería", class: "cat-fish" },
        { idx: 7, label: "🥦 Frutería", class: "cat-veg" },
        { idx: 8, label: "❄️ Refrigerados", class: "cat-cold" },
        { idx: 9, label: "🥫 Despensa", class: "cat-shelf" }
    ];

    let rows = isSuper 
        ? allData.filter(r => (r[0] == 3 || r[0] == 4) && r[1].toLowerCase() !== 'dia') 
        : allData.filter(r => r[0] == currentWeek && r[1].toLowerCase() !== 'dia');

    pasillos.forEach(p => {
        let items = rows.filter(r => r[p.idx] && r[p.idx] !== "");
        
        if (items.length > 0) {
            const group = document.createElement('div');
            group.className = `shop-cat-group ${p.class}`; // Mantiene tus clases de CSS
            group.innerHTML = `<h4>${p.label}</h4>`;
            
            const ul = document.createElement('div'); // Contenedor para los items
            
            items.forEach((item, i) => {
                const id = `chk-${item[0]}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                ul.innerHTML += `
                    <div class="checklist-item">
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                        <label for="${id}">${isSuper ? `<small style="color:blue">S${item[0]}</small> ` : ''}${item[p.idx]}</label>
                    </div>`;
            });
            group.appendChild(ul);
            list.appendChild(group);
        }
    });
}

function changeWeek(d) {
    currentWeek = Math.max(1, currentWeek + d);
    renderApp();
}

function renderApp() {
    const label = document.getElementById('current-week-label');
    if (label) label.innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}
