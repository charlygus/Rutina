let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // Parseo robusto: split por filas y luego por el separador |
        // Usamos una expresión regular para limpiar posibles comillas de Google
        allData = text.split(/\r?\n/).map(row => {
            return row.split('|').map(cell => cell.replace(/^"|"$/g, '').trim());
        });

        console.log("Datos procesados correctamente:", allData);
        renderApp();
    } catch (e) {
        console.error("Error de conexión:", e);
        document.getElementById('days-container').innerHTML = "⚠️ Error al conectar con Google Sheets";
    }
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- MENÚ ---
function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';

    const weekRows = allData.filter(r => r[0] == currentWeek);
    const days = [...new Set(weekRows.map(r => r[1]))].filter(d => d && d !== "dia");

    if(days.length === 0) {
        container.innerHTML = `<div class="day-card">No hay datos para la Semana ${currentWeek}</div>`;
        return;
    }

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card'; // Usando tu clase original
        
        let html = `<h3 style="margin-top:0; color:#1d1d1f;">${day}</h3>`;
        dayRows.forEach(row => {
            if (row[3] === 'LIBRE') {
                html += `<div style="padding:10px; color:#86868b; font-style:italic;">✨ Día Libre</div>`;
            } else if (row[3]) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid #f2f2f2; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${row[2]}:</strong> ${row[3]}</span>
                    <span style="font-size:0.8rem; background:#eee; padding:2px 8px; border-radius:5px;">Ver</span>
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
    
    // Reset de los campos de tu HTML
    document.getElementById('recipe-lunch-name').innerText = "-";
    document.getElementById('recipe-lunch-steps').innerText = "";
    document.getElementById('recipe-dinner-name').innerText = "-";
    document.getElementById('recipe-dinner-steps').innerText = "";

    dayRows.forEach(row => {
        if (row[2] === 'Comida') {
            document.getElementById('recipe-lunch-name').innerText = row[3];
            document.getElementById('recipe-lunch-steps').innerText = row[4];
        } else if (row[2] === 'Cena') {
            document.getElementById('recipe-dinner-name').innerText = row[3];
            document.getElementById('recipe-dinner-steps').innerText = row[4];
        }
    });

    document.getElementById('recipe-view').classList.add('active');
    document.getElementById('recipe-view').style.display = 'block';
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
    document.getElementById('recipe-view').style.display = 'none';
}

// --- COMPRA ---
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
        ? allData.filter(r => r[0] == 3 || r[0] == 4) 
        : allData.filter(r => r[0] == currentWeek);

    pasillos.forEach(p => {
        let items = [];
        rows.forEach(r => {
            if(r[p.idx] && r[p.idx] !== "" && r[p.idx] !== "carniceria") {
                items.push({ name: r[p.idx], s: r[0] });
            }
        });

        if (items.length > 0) {
            const header = document.createElement('li');
            header.innerHTML = `<h4 style="margin:15px 0 5px 0; font-size:0.7rem; color:#888;">${p.label}</h4>`;
            list.appendChild(header);

            items.forEach((item, i) => {
                const id = `chk-${item.s}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.innerHTML = `
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                    <label for="${id}">${isSuper ? `[S${item.s}] ` : ''}${item.name}</label>
                `;
                list.appendChild(li);
            });
        }
    });
}

function changeWeek(delta) {
    currentWeek = Math.max(1, currentWeek + delta);
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderApp();
}

function renderApp() {
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

// Iniciar
fetchData();
