let allData = [];
let currentWeek = 3; 
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const lines = text.trim().split('\n');

        // DETECTOR AUTOMÁTICO DE SEPARADOR
        // Miramos si la primera línea tiene más puntos y coma que comas
        const delimiter = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';
        
        // Procesamos los datos limpiando comillas dobles que pone Google
        allData = lines.map(line => {
            return line.split(delimiter).map(cell => cell.replace(/^"|"$/g, '').trim());
        });

        console.log("Separador detectado:", delimiter);
        console.log("Muestra de datos:", allData[1]); // Debug en consola

        renderApp();
    } catch (e) {
        console.error("Error cargando el Excel:", e);
        document.getElementById('days-container').innerHTML = "⚠️ Error de conexión con el Excel.";
    }
}

function renderApp() {
    const label = document.getElementById('current-week-label');
    if(label) label.innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

// --- RENDERIZAR MENÚ ---
function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';

    // Filtramos filas de la semana actual (Columna 0)
    const weekRows = allData.filter(row => row[0] == currentWeek);
    
    // Obtenemos los días únicos (Columna 1)
    const days = [...new Set(weekRows.map(row => row[1]))].filter(d => d && d.toLowerCase() !== 'dia');

    if(days.length === 0) {
        container.innerHTML = `<p style="padding:20px; color:gray;">No hay datos para la Semana ${currentWeek}. Revisa la columna A de tu Excel.</p>`;
        return;
    }

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        dayRows.forEach(row => {
            const momento = row[2]; // Comida/Cena
            const plato = row[3];   // Nombre del plato
            
            if (plato === 'LIBRE') {
                html += `<div style="padding:10px; color:#999;">✨ Día Libre</div>`;
            } else if (plato) {
                html += `
                <div class="meal-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid #eee; cursor:pointer;" onclick="openRecipe('${day}')">
                    <span><strong>${momento}:</strong> ${plato}</span>
                    <button class="btn-mini">Ver Receta</button>
                </div>`;
            }
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

// --- RENDERIZAR RECETAS ---
function openRecipe(day) {
    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    document.getElementById('recipe-day-title').innerText = day;
    
    // Limpiamos los campos antes de rellenar
    document.getElementById('recipe-lunch-name').innerText = "No asignado";
    document.getElementById('recipe-lunch-steps').innerText = "";
    document.getElementById('recipe-dinner-name').innerText = "No asignado";
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
}

function closeRecipe() {
    document.getElementById('recipe-view').classList.remove('active');
}

// --- RENDERIZAR COMPRA POR PASILLOS ---
function renderShopping() {
    const shopList = document.getElementById('shopping-list');
    if(!shopList) return;
    shopList.innerHTML = '';

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
        let items = rows.filter(r => r[p.idx] && r[p.idx].length > 1 && r[0] !== "semana").map(r => ({name: r[p.idx], s: r[0]}));
        
        if (items.length > 0) {
            const h4 = document.createElement('h4');
            h4.innerText = p.label;
            h4.style = "margin: 20px 0 10px 0; font-size: 0.75rem; color: #888; text-transform: uppercase;";
            shopList.appendChild(h4);

            items.forEach((item, i) => {
                const id = `chk-${item.s}-${p.idx}-${i}`;
                const checked = localStorage.getItem(id) === 'true';
                const li = document.createElement('li');
                li.style = "list-style:none; display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f0f0f0;";
                li.innerHTML = `
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${id}', this.checked)">
                    <label for="${id}">${isSuper ? `<small style="color:blue">S${item.s}</small> ` : ''}${item.name}</label>
                `;
                shopList.appendChild(li);
            });
        }
    });
}

function changeWeek(delta) {
    currentWeek = Math.max(1, currentWeek + delta);
    renderApp();
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Arrancar
fetchData();
