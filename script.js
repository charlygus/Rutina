let allData = [];
let currentWeek = 1; // Empezamos en la semana 1 según tus datos
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

window.onload = fetchData;

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // 1. Dividir por líneas
        const lines = text.trim().split(/\r?\n/);
        
        if (lines.length === 0) return;

        // 2. Detectar separador (Coma o Punto y coma)
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        
        // Regex dinámica para separar correctamente respetando textos entre comillas
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
        // Si falla, mostramos mensaje en la app
        const container = document.getElementById('days-container');
        if(container) container.innerHTML = '<p style="text-align:center; padding:20px;">Error conectando con la hoja de datos.</p>';
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    
    // Filtramos por semana actual (Columna 0)
    const weekRows = allData.filter(r => r[0] == currentWeek);
    
    // Obtenemos los días únicos (Columna 1)
    // Filtramos para que no salga la cabecera "Dia" si se coló
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
            // Buscamos coincidencia en Columna 2 (Momento)
            const found = dayRows.find(r => r[2] && r[2].trim() === m);
            
            // Columna 3 es el Plato
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
            // Columna 3: Plato, Columna 4: Receta
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

function renderShopping() {
    const list = document.getElementById('shopping-list');
    if(!list) return;
    list.innerHTML = '';
    const isSuper = document.getElementById('supermarket-mode')?.checked;

    // MAPEO DE TUS COLUMNAS (Basado en tus datos)
    // 0:Semana, 1:Dia, 2:Momento, 3:Plato, 4:Receta
    // 5:Carniceria, 6:Pescaderia, 7:Fruteria, 8:Refrigerados, 9:Despensa
    const pasillos = [
        { idx: 5, label: "Carnicería" },
        { idx: 6, label: "Pescadería" },
        { idx: 7, label: "Frutería" },
        { idx: 8, label: "Refrigerados" },
        { idx: 9, label: "Despensa" }
    ];

    // Lógica: Si es Modo Supermercado, muestra S3 + S4. Si no, semana actual.
    // Importante: Filtramos filas que no sean la cabecera "semana"
    let rows = isSuper 
        ? allData.filter(r => (r[0] == 3 || r[0] == 4) && isNaN(r[0]) === false) 
        : allData.filter(r => r[0] == currentWeek);

    let hasItems = false;

    pasillos.forEach(p => {
        // Filtrar items vacíos
        let items = rows.filter(r => r[p.idx] && r[p.idx].trim() !== "");
        
        if (items.length > 0) {
            hasItems = true;
            const h = document.createElement('h4');
            h.className = 'shopping-category-title';
            h.innerText = p.label;
            list.appendChild(h);
            
            items.forEach((item, i) => {
                // ID único para checkbox: w(semana)-(columna)-(indice)-(texto)
                const cleanText = item[p.idx].replace(/[^a-zA-Z0-9]/g, '').slice(0,10);
                const uniqueId = `chk-w${item[0]}-${p.idx}-${i}-${cleanText}`;
                
                const isChecked = localStorage.getItem(uniqueId) === 'true';
                
                const div = document.createElement('div');
                div.className = 'shopping-item';
                
                // Muestra etiqueta S3 o S4 si estamos en modo supermercado
                const weekLabel = isSuper ? `<span style="font-weight:bold; font-size:0.8em; margin-right:5px;">S${item[0]}</span>` : '';

                div.innerHTML = `
                    <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
                    <label for="${uniqueId}" style="flex:1; ${isChecked ? 'text-decoration:line-through; opacity:0.5' : ''}">
                        ${weekLabel}${item[p.idx]}
                    </label>
                `;
                
                // Evento click
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

    if (!hasItems) {
        list.innerHTML = '<p style="text-align:center; padding:30px; color:#aaa;">Nada en la lista para esta selección.</p>';
    }
}

function changeWeek(d) {
    const newWeek = currentWeek + d;
    // Ajusta el límite (ej: si solo tienes 4 semanas, pon newWeek > 4)
    if (newWeek < 1 || newWeek > 4) return; 
    
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
        alert("Peso guardado (simulado).");
    }
}
