let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        // Dividimos por líneas y luego por punto y coma
        allData = text.trim().split('\n').map(row => row.split(';').map(c => c.trim()));
        renderApp();
    } catch (e) {
        console.error("Error cargando Sheets", e);
    }
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}

function renderMenu() {
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;

    const rows = allData.filter(r => r[0] == currentWeek);
    const days = [...new Set(rows.map(r => r[1]))];

    days.forEach(day => {
        if (!day || day === "dia") return;
        const dayRows = rows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        dayRows.forEach(row => {
            if (row[3] === 'LIBRE') {
                html += `<p style="color:#888 italic">✨ Día Libre</p>`;
            } else if (row[3]) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid #eee">
                    <span><strong>${row[2]}:</strong> ${row[3]}</span>
                    <button class="btn-mini" onclick="openRecipe('${day}')">Ver</button>
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

function closeRecipe() { document.getElementById('recipe-view').classList.remove('active'); }

function renderShopping() {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    const pasillos = [
        { idx: 5, label: "🥩 Carnicería" },
        { idx: 6, label: "🐟 Pescadería" },
        { idx: 7, label: "🥦 Frutería" },
        { idx: 8, label: "❄️ Refrigerados" },
        { idx: 9, label: "🥫 Despensa" }
    ];

    const rows = allData.filter(r => r[0] == currentWeek);

    pasillos.forEach(p => {
        let items = rows.filter(r => r[p.idx] && r[p.idx] !== "" && r[0] !== "semana").map(r => r[p.idx]);
        if (items.length > 0) {
            const h = document.createElement('h4');
            h.innerText = p.label;
            h.style = "margin-top:20px; font-size:0.8rem; color:#888";
            list.appendChild(h);
            
            items.forEach((item, i) => {
                const id = `chk-${currentWeek}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; padding:5px 0; border-bottom:1px solid #f2f2f2";
                li.innerHTML = `<input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)"><label for="${id}" style="margin-left:10px">${item}</label>`;
                list.appendChild(li);
            });
        }
    });
}

function changeWeek(d) {
    currentWeek = Math.max(1, currentWeek + d);
    renderApp();
}

function renderApp() { renderMenu(); renderShopping(); }

fetchData();
