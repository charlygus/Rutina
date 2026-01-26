let allData = [];
let currentWeek = 3;

// URL de tu Google Sheets (Formato CSV)
const SHEETS_URL = "TU_URL_AQUÍ_QUE_TERMINA_EN_PUB_OUTPUT_CSV";

async function init() {
    try {
        const response = await fetch(SHEETS_URL);
        const text = await response.text();
        // Separamos por la barra vertical | que pusimos en el Excel
        allData = text.split('\n').map(row => row.split('|').map(cell => cell.trim()));
        renderApp();
        initWeightChart();
    } catch (e) {
        console.error("Error cargando datos", e);
    }
}

function renderApp() {
    document.getElementById('current-week-label').innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tabName}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- MENÚ Y RECETAS ---
function renderMenu() {
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    const weekRows = allData.filter(r => r[0] == currentWeek);

    // Agrupamos por día para crear una tarjeta por día
    const days = [...new Set(weekRows.map(r => r[1]))];

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = `day-card ${dayRows[0][3] === 'LIBRE' ? 'cheat-day' : ''}`;
        
        let mealsHtml = `<h4>${day}</h4>`;
        dayRows.forEach(row => {
            if(row[3] === 'LIBRE') {
                mealsHtml += `<p>🥳 ¡Día Libre!</p>`;
            } else if(row[3] !== 'plato') {
                mealsHtml += `
                <div class="meal-row">
                    <span><strong>${row[2]}:</strong> ${row[3]}</span>
                    <button class="btn-mini" onclick="openRecipe('${day}')">Ver</button>
                </div>`;
            }
        });
        card.innerHTML = mealsHtml;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const recipeView = document.getElementById('recipe-view');
    const container = document.getElementById('recipe-cards-container');
    document.getElementById('recipe-day-title').innerText = day;
    container.innerHTML = '';

    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    dayRows.forEach(row => {
        if(row[4]) {
            container.innerHTML += `
                <div class="recipe-card" style="margin-bottom:20px; border:1px solid #eee; padding:15px; border-radius:10px;">
                    <div style="color:var(--primary); font-weight:bold; margin-bottom:5px;">${row[2]}</div>
                    <div style="font-size:1.1em; font-weight:800; margin-bottom:10px;">${row[3]}</div>
                    <div style="line-height:1.5; color:#444;">${row[4]}</div>
                </div>`;
        }
    });
    recipeView.classList.add('active');
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
}

// --- COMPRA POR PASILLOS ---
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
            if(r[p.idx] && r[p.idx] !== 'carniceria' && r[p.idx] !== 'pescaderia') {
                items.push({ text: r[p.idx], s: r[0] });
            }
        });

        if(items.length > 0) {
            const sec = document.createElement('div');
            sec.className = `shop-section ${p.class}`;
            sec.innerHTML = `<h5>${p.label}</h5>`;
            const ul = document.createElement('ul');
            ul.className = "checklist-minimal";
            
            items.forEach((item, i) => {
                const id = `check-${item.s}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                ul.innerHTML += `
                    <li>
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="saveCheck('${id}', this.checked)">
                        <label for="${id}">${isSuper ? `[S${item.s}] ` : ''}${item.text}</label>
                    </li>`;
            });
            sec.appendChild(ul);
            container.appendChild(sec);
        }
    });
}

function saveCheck(id, val) { localStorage.setItem(id, val); }

function changeWeek(delta) {
    currentWeek = Math.max(1, currentWeek + delta);
    renderApp();
}

// Iniciar app
init();
