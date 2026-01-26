let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        // El separador es la barra vertical |
        allData = text.split('\n').map(row => row.split('|').map(cell => cell.trim()));
        renderApp();
    } catch (e) { console.error("Error cargando Sheets", e); }
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

function renderMenu() {
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    const weekRows = allData.filter(r => r[0] == currentWeek);
    const days = [...new Set(weekRows.map(r => r[1]))];

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        if(!dayRows[0] || dayRows[0][1] === 'dia') return;

        const card = document.createElement('div');
        card.className = 'day-card';
        let html = `<h4>${day}</h4>`;
        
        dayRows.forEach(row => {
            if(row[3] === 'LIBRE') html += `<p style="color:var(--accent)">✨ Día Libre</p>`;
            else {
                html += `
                <div class="meal-row">
                    <div><strong>${row[2]}</strong><span>${row[3]}</span></div>
                    <button class="btn-mini" onclick="openRecipe('${day}')">Receta</button>
                </div>`;
            }
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const container = document.getElementById('recipe-cards-container');
    document.getElementById('recipe-day-title').innerText = day;
    container.innerHTML = '';
    
    allData.filter(r => r[0] == currentWeek && r[1] === day).forEach(row => {
        if(row[4] && row[4] !== 'receta') {
            container.innerHTML += `
                <div style="margin-bottom:25px">
                    <small style="color:var(--accent); font-weight:700">${row[2]}</small>
                    <h3 style="margin:5px 0">${row[3]}</h3>
                    <p style="line-height:1.6; color:#444">${row[4]}</p>
                </div>`;
        }
    });
    document.getElementById('recipe-view').classList.add('active');
}

function closeRecipe() { document.getElementById('recipe-view').classList.remove('active'); }

function renderShopping() {
    const container = document.getElementById('shopping-list');
    container.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode').checked;
    
    const pasillos = [
        { idx: 5, label: "🥩 Carnicería", class: "cat-meat" },
        { idx: 6, label: "🐟 Pescadería", class: "cat-fish" },
        { idx: 7, label: "🥦 Frutería", class: "cat-veg" },
        { idx: 8, label: "❄️ Refrigerados", class: "cat-cold" },
        { idx: 9, label: "🥫 Despensa", class: "cat-shelf" }
    ];

    let rows = isSuper ? allData.filter(r => r[0] == 3 || r[0] == 4) : allData.filter(r => r[0] == currentWeek);

    pasillos.forEach(p => {
        let items = [];
        rows.forEach(r => {
            if(r[p.idx] && r[p.idx] !== 'carniceria' && r[p.idx] !== 'despensa' && r[p.idx] !== "") {
                items.push({ text: r[p.idx], s: r[0] });
            }
        });

        if(items.length > 0) {
            const sec = document.createElement('div');
            sec.className = `shop-section ${p.class}`;
            sec.innerHTML = `<h5>${p.label}</h5>`;
            const ul = document.createElement('ul');
            ul.className = 'checklist-minimal';
            items.forEach((item, i) => {
                const id = `chk-${item.s}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                ul.innerHTML += `
                    <li>
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                        <label for="${id}">${isSuper ? `[S${item.s}] ` : ''}${item.text}</label>
                    </li>`;
            });
            sec.appendChild(ul);
            container.appendChild(sec);
        }
    });
}

function changeWeek(v) {
    currentWeek = Math.max(1, currentWeek + v);
    renderApp();
}

fetchData();
