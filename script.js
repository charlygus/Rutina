let allData = [];
let currentWeek = 3;
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const lines = text.trim().split('\n');

        // DETECTOR AUTOMÁTICO DE SEPARADOR
        const delimiter = lines[0].includes(';') ? ';' : ',';
        
        allData = lines.map(line => 
            line.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim())
        );

        console.log("Datos cargados con separador:", delimiter);
        renderApp();
    } catch (e) {
        console.error("Error cargando Sheets", e);
        document.getElementById('current-week-label').innerText = "Error ❌";
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    
    const weekRows = allData.filter(r => r[0] == currentWeek && r[1] && r[1].toLowerCase() !== 'dia');
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
        const momentos = ["Desayuno", "Comida", "Cena"];
        
        momentos.forEach(m => {
            const found = dayRows.find(r => r[2] === m);
            if (found && found[3]) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid #f2f2f2; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span style="font-size:0.9rem;"><strong>${m.charAt(0)}:</strong> ${found[3]}</span>
                    <span style="font-size:0.6rem; background:#000; color:#fff; padding:3px 6px; border-radius:4px;">VER</span>
                </div>`;
            }
        });

        if (dayRows.find(r => r[3] === 'LIBRE')) {
            html = `<h3>${day}</h3><p style="color:#999; font-style:italic;">✨ Día Libre</p>`;
        }
        
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    document.getElementById('recipe-day-title').innerText = day;
    
    const d = dayRows.find(r => r[2] === 'Desayuno');
    const c = dayRows.find(r => r[2] === 'Comida');
    const n = dayRows.find(r => r[2] === 'Cena');

    document.getElementById('recipe-lunch-name').innerHTML = `🍱 ${c ? c[3] : '-'}<br><small>☕ Desayuno: ${d ? d[3] : '-'}</small>`;
    document.getElementById('recipe-lunch-steps').innerHTML = `<strong>Preparación:</strong><br>${c ? c[4] : '-'}<br><br>${d ? d[4] : ''}`;
    
    document.getElementById('recipe-dinner-name').innerText = n ? n[3] : '-';
    document.getElementById('recipe-dinner-steps').innerText = n ? n[4] : '-';

    document.getElementById('recipe-view').classList.add('active');
}

function closeRecipe() { document.getElementById('recipe-view').classList.remove('active'); }

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
        let items = rows.filter(r => r[p.idx] && r[p.idx] !== "" && r[1].toLowerCase() !== 'dia');
        
        if (items.length > 0) {
            const h = document.createElement('h4');
            h.innerText = p.label;
            h.style = "margin:20px 0 8px 0; font-size:0.75rem; color:#888; text-transform:uppercase;";
            list.appendChild(h);
            
            items.forEach((item, i) => {
                const id = `chk-${item[0]}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; padding:10px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:12px;";
                li.innerHTML = `
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                    <label for="${id}" style="font-size:1rem; font-weight:500;">${isSuper ? `<small style="color:blue">S${item[0]}</small> ` : ''}${item[p.idx]}</label>
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

function renderApp() {
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

fetchData();
