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

        // Detectar separador automáticamente
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

        allData = lines.map(line => {
            return line.split(regex).map(cell => {
                return cell.replace(/^["']|["']$/g, '').trim();
            });
        });

        console.log("Datos cargados. Total filas:", allData.length);
        renderApp();
        
    } catch (e) {
        console.error("Error cargando Google Sheets:", e);
        const container = document.getElementById('days-container');
        if(container) container.innerHTML = '<p style="text-align:center; padding:20px;">Error conectando con la hoja de datos.</p>';
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    
    // Filtro estricto para la semana actual
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
            const nombrePlato = found[3] || "";
            const pasos = found[4] || "Ver ingredientes.";

            const html = `
                <div class="recipe-box">
                    <div class="recipe-tag">${m}</div>
                    <div class="recipe-name">${nombrePlato}</div>
                    <div class="recipe-text">${pasos}</div>
                </div>
            `;
            container.innerHTML += html;
        }
    });
    document.getElementById('recipe-view').classList.add('active');
}

// --- LÓGICA DE COMPRA CON CONTADOR (x3) ---
function renderShopping() {
    const list = document.getElementById('shopping-list');
    if(!list) return;
    list.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode')?.checked;

    // Índices de columnas según tu Excel
    const pasillos = [
        { idx: 5, label: "Carnicería" },
        { idx: 6, label: "Pescadería" },
        { idx: 7, label: "Frutería" },
        { idx: 8, label: "Refrigerados" },
        { idx: 9, label: "Despensa" }
    ];

    // Selección de filas
    let rows = isSuper 
        ? allData.filter(r => (r[0] == 3 || r[0] == 4) && isNaN(r[0]) === false) 
        : allData.filter(r => r[0] == currentWeek);

    let globalHasItems = false;

    pasillos.forEach(p => {
        // Usamos un OBJETO para contar frecuencias: { "Yogur": 5, "Nueces": 2 }
        let itemCounts = {};

        rows.forEach(r => {
            const cellContent = r[p.idx];
            if (cellContent && cellContent.trim() !== "") {
                // Separamos ingredientes múltiples en la misma celda
                const ingredients = cellContent.split(/[,|\n]/);
                
                ingredients.forEach(ing => {
                    let clean = ing.trim();
                    if(clean.length > 1) { 
                        // Normalizamos texto
                        clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
                        
                        // Si ya existe, sumamos 1. Si no, inicializamos en 1.
                        if (itemCounts[clean]) {
                            itemCounts[clean]++;
                        } else {
                            itemCounts[clean] = 1;
                        }
                    }
                });
            }
        });
        
        // Convertimos el objeto a array para ordenarlo
        const sortedItems = Object.keys(itemCounts).sort();

        if (sortedItems.length > 0) {
            globalHasItems = true;
            const h = document.createElement('h4');
            h.className = 'shopping-category-title';
            h.innerText = p.label;
            list.appendChild(h);
            
            sortedItems.forEach((item) => {
                const count = itemCounts[item];
                
                // Generamos etiqueta de cantidad solo si es > 1
                const qtyLabel = count > 1 ? ` <span style="color:#000; font-weight:800;">(x${count})</span>` : '';
                
                // ID único basado en nombre y pasillo
                const cleanName = item.replace(/[^a-zA-Z0-9]/g, '');
                const uniqueId = `shop-${p.idx}-${cleanName}`;
                
                const isChecked = localStorage.getItem(uniqueId) === 'true';
                
                const div = document.createElement('div');
                div.className = 'shopping-item';
                div.innerHTML = `
                    <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
                    <label for="${uniqueId}" style="flex:1; ${isChecked ? 'text-decoration:line-through; opacity:0.5' : ''}">
                        ${item}${qtyLabel}
                    </label>
                `;
                
                const input = div.querySelector('input');
                const label = div.querySelector('label');
                
                input.addEventListener('change', (e) => {
                    localStorage.setItem(uniqueId, e.target.checked);
                    label.style.textDecoration = e.target.checked ? 'line-through' : 'none';
                    label.style.opacity = e.target.checked ? '0.5' : '1';
                });

                list.appendChild(div);
            });
        }
    });

    if (!globalHasItems) {
        list.innerHTML = '<p style="text-align:center; padding:30px; color:#aaa;">Nada en la lista.</p>';
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

function closeRecipe() { 
    document.getElementById('recipe-view').classList.remove('active'); 
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tabId}-view`).classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-link');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

function enviarPeso() {
    const val = document.getElementById('weight-input').value;
    if(val) {
        document.getElementById('last-weight').innerText = val + ' kg';
        alert("Peso guardado.");
    }
}
