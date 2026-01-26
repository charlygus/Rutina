let allData = [];
let currentWeek = 3; // Asegúrate de que en tu Excel haya datos de la semana 3
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // Limpiamos el texto para evitar líneas vacías y saltos de carro extraños
        allData = text.trim().split('\n')
            .map(row => row.split('|').map(cell => cell.trim()));
        
        console.log("Datos cargados:", allData); // Mira la consola del navegador si falla
        renderApp();
    } catch (e) {
        console.error("Error cargando Sheets:", e);
    }
}

function renderApp() {
    const label = document.getElementById('current-week-label');
    if(label) label.innerText = `Semana ${currentWeek}`;
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
    if(!container) return;
    container.innerHTML = '';

    // Filtramos filas de la semana actual que tengan un plato definido
    const weekRows = allData.filter(r => r[0] == currentWeek && r[3] && r[3] !== 'plato');
    const days = [...new Set(weekRows.map(r => r[1]))];

    if(days.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No hay datos para la Semana ${currentWeek}</p>`;
        return;
    }

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        dayRows.forEach(row => {
            if (row[3] === 'LIBRE') {
                html += `<div class="menu-item-simple">✨ DÍA LIBRE</div>`;
            } else {
                html += `
                <div class="menu-item-row" onclick="openRecipe('${day}')">
                    <span class="momento-icon">${row[2] === 'Comida' ? '☀️' : '🌙'}</span>
                    <span class="plato-text"><strong>${row[2]}:</strong> ${row[3]}</span>
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
    
    // Limpiar campos
    document.getElementById('recipe-lunch-name').innerText = "Libre / Sin asignar";
    document.getElementById('recipe-lunch-steps').innerText = "";
    document.getElementById('recipe-dinner-name').innerText = "Libre / Sin asignar";
    document.getElementById('recipe-dinner-steps').innerText = "";

    dayRows.forEach(row => {
        if (row[2] === 'Comida') {
            document.getElementById('recipe-lunch-name').innerText = row[3];
            document.getElementById('recipe-lunch-steps').innerText = row[4] || "Sin pasos";
        } else if (row[2] === 'Cena') {
            document.getElementById('recipe-dinner-name').innerText = row[3];
            document.getElementById('recipe-dinner-steps').innerText = row[4] || "Sin pasos";
        }
    });

    document.getElementById('recipe-view').classList.add('active');
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
}

// --- COMPRA ---
function renderShopping() {
    const listContainer = document.getElementById('shopping-list');
    if(!listContainer) return;
    listContainer.innerHTML = '';

    const isSuper = document.getElementById('supermarket-mode').checked;
    const pasillos = [
        { idx: 5, label: "🥩 Carnicería", color: "#ff8787" },
        { idx: 6, label: "🐟 Pescadería", color: "#74c0fc" },
        { idx: 7, label: "🥦 Frutería", color: "#8ce99a" },
        { idx: 8, label: "❄️ Refrigerados", color: "#b197fc" },
        { idx: 9, label: "🥫 Despensa", color: "#ffd43b" }
    ];

    let rows = isSuper 
        ? allData.filter(r => r[0] == 3 || r[0] == 4) 
        : allData.filter(r => r[0] == currentWeek);

    pasillos.forEach(p => {
        let items = [];
        rows.forEach(r => {
            if(r[p.idx] && r[p.idx] !== "" && r[p.idx] !== "carniceria" && r[p.idx] !== "despensa") {
                items.push({ name: r[p.idx], s: r[0] });
            }
        });

        if (items.length > 0) {
            const group = document.createElement('div');
            group.className = 'shop-group';
            group.innerHTML = `<h4 style="border-left: 4px solid ${p.color}; padding-left:10px;">${p.label}</h4>`;
            
            const ul = document.createElement('ul');
            ul.className = 'checklist-minimal';
            
            items.forEach((item, i) => {
                const id = `chk-${item.s}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                ul.innerHTML += `
                    <li>
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                        <label for="${id}">${isSuper ? `<small>[S${item.s}]</small> ` : ''}${item.name}</label>
                    </li>`;
            });
            group.appendChild(ul);
            listContainer.appendChild(group);
        }
    });
}

function changeWeek(delta) {
    currentWeek = Math.max(1, currentWeek + delta);
    renderApp();
}

// Iniciar
fetchData();
