let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

// Forzar carga al abrir
window.onload = fetchData;

async function fetchData() {
    const container = document.getElementById('days-container');
    container.innerHTML = "<h3>⏳ Cargando datos...</h3>";

    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // Dividimos por filas y limpiamos espacios
        const rows = text.trim().split(/\r?\n/);
        
        // Detectamos si el Excel usa ; o ,
        const separator = rows[0].includes(';') ? ';' : ',';
        
        // Procesamos limpiando comillas dobles que pone Google
        allData = rows.map(row => 
            row.split(separator).map(cell => cell.replace(/^["']|["']$/g, '').trim())
        );

        console.log("Datos cargados. Ejemplo fila 1:", allData[1]);
        renderApp();
    } catch (e) {
        container.innerHTML = `<h3 style="color:red">❌ Error: No se pudo cargar el Excel.</h3><p>${e.message}</p>`;
    }
}

function renderApp() {
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

function renderMenu() {
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    // Filtrar por semana actual (Columna 0)
    const weekRows = allData.filter(r => r[0] == currentWeek);
    
    // Si no hay filas, avisamos
    if (weekRows.length === 0) {
        container.innerHTML = `<h3>⚠️ No hay platos para la Semana ${currentWeek}</h3><p>Revisa que la primera columna de tu Excel tenga el número ${currentWeek}.</p>`;
        return;
    }

    // Días únicos
    const days = [...new Set(weekRows.map(r => r[1]))].filter(d => d && d.toLowerCase() !== 'dia');

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        const momentos = ["Desayuno", "Comida", "Cena"];
        
        momentos.forEach(m => {
            const row = dayRows.find(r => r[2] === m);
            if (row && row[3]) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid #eee; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${m.charAt(0)}:</strong> ${row[3]}</span>
                    <button class="btn-mini" style="background:#000; color:#fff; border:none; padding:4px 8px; border-radius:5px; font-size:0.7rem;">VER</button>
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

    document.getElementById('recipe-breakfast-name').innerText = d[3];
    document.getElementById('recipe-breakfast-steps').innerText = d[4] || "Sin pasos";
    
    document.getElementById('recipe-lunch-name').innerText = c[3];
    document.getElementById('recipe-lunch-steps').innerText = c[4] || "Sin pasos";
    
    document.getElementById('recipe-dinner-name').innerText = n[3];
    document.getElementById('recipe-dinner-steps').innerText = n[4] || "Sin pasos";

    document.getElementById('recipe-view').classList.add('active');
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
}

function renderShopping() {
    const list = document.getElementById('shopping-list');
    if(!list) return;
    list.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode')?.checked;

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
            h.style = "margin:20px 0 8px 0; font-size:0.75rem; color:#888; text-transform:uppercase;";
            list.appendChild(h);
            
            items.forEach((item, i) => {
                const id = `chk-${item[0]}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:12px;";
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

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}
