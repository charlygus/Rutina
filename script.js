let allData = [];
let currentWeek = 1; 
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

window.onload = fetchData;

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        if (lines.length === 0) return;

        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

        allData = lines.map(line => {
            return line.split(regex).map(cell => {
                return cell.replace(/^["']|["']$/g, '').trim();
            });
        });

        renderApp();
    } catch (e) {
        console.error("Error cargando Google Sheets:", e);
        const container = document.getElementById('days-container');
        if(container) container.innerHTML = '<p style="text-align:center; padding:20px;">Error de conexión.</p>';
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    
    const weekRows = allData.filter(r => r[0] == currentWeek);
    const days = [...new Set(weekRows.map(r => r[1]))].filter(d => d.toLowerCase() !== 'dia');

    if (days.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">Cargando menú...</p>';
        return;
    }

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        let html = `<h3>${day}</h3>`;
        const momentos = ["Desayuno", "Comida", "Cena"]; 
        
        momentos.forEach(m => {
            const found = dayRows.find(r => r[2] && r[2].trim() === m);
            if (found && found[3]) {
                html += `
                <div class="meal-row" onclick="openRecipe('${day}')">
                    <span><strong>${m.charAt(0)}:</strong> ${found[3]}</span>
                    <button class="btn-mini">VER</button>
                </div>`;
            }
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function openRecipe(day) {
    const dayRows = allData.filter(r => r[0] == currentWeek && r[1] === day);
    const titleEl = document.getElementById('recipe-day-title');
    if(titleEl) titleEl.innerText = day;
    const container = document.getElementById('recipe-container');
    container.innerHTML = ''; 
    const momentos = ["Desayuno", "Comida", "Cena"];
    momentos.forEach(m => {
        const found = dayRows.find(r => r[2] === m);
        if (found) {
            container.innerHTML += `
                <div class="recipe-box">
                    <div class="recipe-tag">${m}</div>
                    <div class="recipe-name">${found[3] || ""}</div>
                    <div class="recipe-text">${found[4] || "Ver ingredientes."}</div>
                </div>`;
        }
    });
    document.getElementById('recipe-view').classList.add('active');
}

function getSingularKey(word) {
    let w = word.toLowerCase().trim();
    const map = { "nueces": "nuez", "peces": "pez", "panes": "pan", "calabacines": "calabacin", "champiñones": "champiñon", "esparragos": "esparrago" };
    if (map[w]) return map[w];
    if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
    return w;
}

// --- LÓGICA DE COMPRA MEJORADA PARA MODO SUPERMERCADO ---
function renderShopping() {
    const list = document.getElementById('shopping-list');
    if(!list) return;
    list.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode')?.checked;

    const pasillos = [
        { idx: 5, label: "Carnicería" },
        { idx: 6, label: "Pescadería" },
        { idx: 7, label: "Frutería" },
        { idx: 8, label: "Refrigerados" },
        { idx: 9, label: "Despensa" }
    ];

    let rows = isSuper 
        ? allData.filter(r => (r[0] == 3 || r[0] == 4) && isNaN(r[0]) === false) 
        : allData.filter(r => r[0] == currentWeek);

    let globalHasItems = false;

    pasillos.forEach(p => {
        // Estructura: { "ajo": { display: "Ajo", weeks: { "3": 2, "4": 1 } } }
        let itemsMap = {};

        rows.forEach(r => {
            const weekNum = r[0];
            const cellContent = r[p.idx];
            if (cellContent && cellContent.trim() !== "") {
                const ingredients = cellContent.split(/[,|\n]/);
                ingredients.forEach(ing => {
                    let cleanDisplay = ing.trim();
                    if(cleanDisplay.length > 1) { 
                        cleanDisplay = cleanDisplay.charAt(0).toUpperCase() + cleanDisplay.slice(1).toLowerCase();
                        let key = getSingularKey(cleanDisplay);

                        if (!itemsMap[key]) {
                            itemsMap[key] = { display: cleanDisplay, weeks: {} };
                        }
                        
                        // Guardamos el nombre más corto para el display
                        if (cleanDisplay.length < itemsMap[key].display.length) {
                            itemsMap[key].display = cleanDisplay;
                        }

                        // Contamos por semana
                        itemsMap[key].weeks[weekNum] = (itemsMap[key].weeks[weekNum] || 0) + 1;
                    }
                });
            }
        });
        
        const sortedKeys = Object.keys(itemsMap).sort((a, b) => itemsMap[a].display.localeCompare(itemsMap[b].display));

        if (sortedKeys.length > 0) {
            globalHasItems = true;
            list.innerHTML += `<h4 class="shopping-category-title">${p.label}</h4>`;
            
            sortedKeys.forEach((key) => {
                const itemData = itemsMap[key];
                let labelExtra = "";
                let totalCount = 0;

                // Generamos el texto de semanas si hay varias o si es modo súper
                if (isSuper) {
                    let weekDetails = [];
                    Object.keys(itemData.weeks).sort().forEach(w => {
                        weekDetails.push(`x${itemData.weeks[w]} S${w}`);
                        totalCount += itemData.weeks[w];
                    });
                    labelExtra = ` <span style="color:#666; font-size:0.85em; font-weight:400;">(${weekDetails.join(' y ')})</span>`;
                } else {
                    // Modo normal: solo (xN)
                    totalCount = Object.values(itemData.weeks).reduce((a, b) => a + b, 0);
                    labelExtra = totalCount > 1 ? ` <span style="font-weight:800;">(x${totalCount})</span>` : '';
                }

                const cleanIdName = itemData.display.replace(/[^a-zA-Z0-9]/g, '');
                const uniqueId = `shop-${p.idx}-${cleanIdName}-${isSuper ? 'super' : currentWeek}`;
                const isChecked = localStorage.getItem(uniqueId) === 'true';
                
                const div = document.createElement('div');
                div.className = 'shopping-item';
                div.innerHTML = `
                    <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
                    <label for="${uniqueId}" style="flex:1; ${isChecked ? 'text-decoration:line-through; opacity:0.5' : ''}">
                        <span style="font-weight:600;">${itemData.display}</span>${labelExtra}
                    </label>
                `;
                
                const input = div.querySelector('input');
                input.addEventListener('change', (e) => {
                    localStorage.setItem(uniqueId, e.target.checked);
                    const label = e.target.nextElementSibling;
                    label.style.textDecoration = e.target.checked ? 'line-through' : 'none';
                    label.style.opacity = e.target.checked ? '0.5' : '1';
                });
                list.appendChild(div);
            });
        }
    });

    if (!globalHasItems) {
        list.innerHTML = '<p style="text-align:center; padding:30px; color:#aaa;">Lista vacía.</p>';
    }
}

function changeWeek(d) {
    const newWeek = currentWeek + d;
    if (newWeek < 1 || newWeek > 10) return; 
    currentWeek = newWeek;
    renderApp();
}

function renderApp() {
    const label = document.getElementById('current-week-label');
    if(label) label.innerText = `Semana ${currentWeek}`;
    renderMenu();
    renderShopping();
}

function closeRecipe() { document.getElementById('recipe-view').classList.remove('active'); }

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tabId}-view`).classList.add('active');
    const buttons = document.querySelectorAll('.tab-link');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active');
    });
}

function enviarPeso() {
    const val = document.getElementById('weight-input').value;
    if(val) {
        document.getElementById('last-weight').innerText = val + ' kg';
        alert("Peso guardado.");
    }
}
