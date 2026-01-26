let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

// Carga inicial
async function init() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const lines = text.trim().split('\n');
        
        // Detectar separador automáticamente (; o ,)
        const delimiter = lines[0].includes(';') ? ';' : ',';
        
        // Procesar datos y limpiar comillas de Google
        allData = lines.map(line => 
            line.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim())
        );

        renderApp();
        loadBasics();
    } catch (e) {
        console.error("Error cargando datos:", e);
    }
}

function renderApp() {
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
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
    container.innerHTML = '';
    
    const weekRows = allData.filter(r => r[0] == currentWeek);
    const days = [...new Set(weekRows.map(r => r[1]))].filter(d => d && d.toLowerCase() !== 'dia');

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        dayRows.forEach(row => {
            if (row[3] === 'LIBRE') {
                html += `<p style="color:#888; font-style:italic;">✨ Día Libre</p>`;
            } else if (row[3]) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid #eee; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${row[2]}:</strong> ${row[3]}</span>
                    <button class="btn-mini" style="background:#000; color:#fff; border:none; padding:4px 8px; border-radius:5px; font-size:0.7rem;">Ver</button>
                </div>`;
            }
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const rows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    document.getElementById('recipe-day-title').innerText = day;
    
    // Reset campos
    document.getElementById('recipe-lunch-name').innerText = "-";
    document.getElementById('recipe-lunch-steps').innerText = "";
    document.getElementById('recipe-dinner-name').innerText = "-";
    document.getElementById('recipe-dinner-steps').innerText = "";

    rows.forEach(row => {
        if (row[2] === 'Comida') {
            document.getElementById('recipe-lunch-name').innerText = row[3];
            document.getElementById('recipe-lunch-steps').innerText = row[4];
        } else if (row[2] === 'Cena') {
            document.getElementById('recipe-dinner-name').innerText = row[3];
            document.getElementById('recipe-dinner-steps').innerText = row[4];
        }
    });
    document.getElementById('recipe-view').classList.add('active');
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
}

// --- COMPRA ---
function renderShopping() {
    const container = document.getElementById('shopping-list-container');
    container.innerHTML = '';
    const isSuperMode = document.getElementById('supermarket-mode').checked;
    
    const pasillos = [
        { idx: 5, label: "🥩 CARNICERÍA" },
        { idx: 6, label: "🐟 PESCADERÍA" },
        { idx: 7, label: "🥦 FRUTERÍA" },
        { idx: 8, label: "❄️ REFRIGERADOS" },
        { idx: 9, label: "🥫 DESPENSA" }
    ];

    let rows = isSuperMode 
        ? allData.filter(r => r[0] == 3 || r[0] == 4) 
        : allData.filter(r => r[0] == currentWeek);

    pasillos.forEach(p => {
        const items = rows.filter(r => r[p.idx] && r[p.idx] !== "" && r[0] !== "semana");
        
        if (items.length > 0) {
            const section = document.createElement('div');
            section.innerHTML = `<h4 style="margin:15px 0 5px 0; font-size:0.7rem; color:#888;">${p.label}</h4>`;
            const ul = document.createElement('ul');
            ul.className = 'checklist-minimal';

            items.forEach((row, i) => {
                const id = `chk-${row[0]}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                ul.innerHTML += `
                    <li style="list-style:none; display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid #eee;">
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                        <label for="${id}">${isSuperMode ? `<small style="color:blue">S${row[0]}</small> ` : ''}${row[p.idx]}</label>
                    </li>`;
            });
            section.appendChild(ul);
            container.appendChild(section);
        }
    });
}

// Navegación de semanas
function changeWeek(d) {
    currentWeek = Math.max(1, currentWeek + d);
    renderApp();
}

// Básicos
function saveBasic(id, val) { localStorage.setItem(id, val); }
function loadBasics() {
    ['b1', 'b2', 'b3', 'b4'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.checked = localStorage.getItem(id) === 'true';
    });
}

init();
