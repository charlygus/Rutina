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

// --- FUNCIÓN INTELIGENTE PARA UNIFICAR PLURALES ---
function getSingularKey(word) {
    let w = word.toLowerCase().trim();
    
    // 1. Diccionario de excepciones comunes en cocina
    const map = {
        "nueces": "nuez",
        "peces": "pez",
        "panes": "pan",
        "calabacines": "calabacin",
        "champiñones": "champiñon",
        "esparragos": "esparrago"
    };
    if (map[w]) return map[w];

    // 2. Heurística básica: Si acaba en 's' y no es muy corta (ej: 'res', 'dos'), quitamos la 's'
    // Esto convierte "Ajos" -> "Ajo", "Huevos" -> "Huevo", "Pimientos" -> "Pimiento"
    if (w.length > 3 && w.endsWith('s')) {
        return w.slice(0, -1);
    }
    
    return w;
}

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
        // Usamos un objeto para guardar info completa: { "ajo": {count: 2, display: "Ajo"} }
        let itemsMap = {};

        rows.forEach(r => {
            const cellContent = r[p.idx];
            if (cellContent && cellContent.trim() !== "") {
                const ingredients = cellContent.split(/[,|\n]/);
                
                ingredients.forEach(ing => {
                    let cleanDisplay = ing.trim();
                    if(cleanDisplay.length > 1) { 
                        // Normalizamos display (Primera Mayúscula)
                        cleanDisplay = cleanDisplay.charAt(0).toUpperCase() + cleanDisplay.slice(1).toLowerCase();
                        
                        // Obtenemos la CLAVE ÚNICA singularizada (Ajos -> ajo)
                        let key = getSingularKey(cleanDisplay);

                        if (itemsMap[key]) {
                            itemsMap[key].count++;
                            // Truco visual: Nos quedamos con el nombre más corto (Prefiero "Ajo" a "Ajos")
                            if (cleanDisplay.length < itemsMap[key].display.length) {
                                itemsMap[key].display = cleanDisplay;
                            }
                        } else {
                            itemsMap[key] = { count: 1, display: cleanDisplay };
                        }
                    }
                });
            }
        });
        
        // Convertimos el mapa a array y ordenamos por el nombre visible
        const sortedKeys = Object.keys(itemsMap).sort((a, b) => itemsMap[a].display.localeCompare(itemsMap[b].display));

        if (sortedKeys.length > 0) {
            globalHasItems = true;
            const h = document.createElement('h4');
            h.className = 'shopping-category-title';
            h.innerText = p.label;
            list.appendChild(h);
            
            sortedKeys.forEach((key) => {
                const itemData = itemsMap[key];
                
                // Generamos etiqueta de cantidad
                const qtyLabel = itemData.count > 1 ? ` <span style="color:#000; font-weight:800;">(x${itemData.count})</span>` : '';
                
                // ID único
                const cleanIdName = itemData.display.replace(/[^a-zA-Z0-9]/g, '');
                const uniqueId = `shop-${p.idx}-${cleanIdName}`;
                
                const isChecked = localStorage.getItem(uniqueId) === 'true';
                
                const div = document.createElement('div');
                div.className = 'shopping-item';
                div.innerHTML = `
                    <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
                    <label for="${uniqueId}" style="flex:1; ${isChecked ? 'text-decoration:line-through; opacity:0.5' : ''}">
                        ${itemData.display}${qtyLabel}
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
