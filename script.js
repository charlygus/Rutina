let allData = [];
let currentWeek = 3; // Semana inicial por defecto

// IMPORTANTE: Asegúrate de que esta URL termina en output=csv
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

window.onload = fetchData;

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // 1. Dividir por líneas (maneja saltos de línea Windows/Mac/Linux)
        const lines = text.trim().split(/\r?\n/);
        
        if (lines.length === 0) return;

        // 2. Mapear cada línea a columnas usando Regex para CSV
        // Esto separa por comas PERO ignora las comas dentro de comillas (ej: "Sal, pimienta")
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        allData = lines.map(line => {
            return line.split(regex).map(cell => {
                // Eliminar comillas envolventes si existen y espacios extra
                return cell.replace(/^["']|["']$/g, '').trim();
            });
        });

        console.log("Datos cargados correctamente. Filas:", allData.length);
        renderApp();
        
    } catch (e) {
        console.error("Error cargando Google Sheets:", e);
        document.getElementById('days-container').innerHTML = 
            '<p style="text-align:center; padding:20px; color:red;">Error conectando con la base de datos.</p>';
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    
    // Filtrar: Semana actual y asegurar que no sea la fila de cabecera
    const weekRows = allData.filter(r => r[0] == currentWeek && r[1] && r[1].toLowerCase() !== 'dia');
    
    // Obtener días únicos de esa semana (Lunes, Martes...)
    const days = [...new Set(weekRows.map(r => r[1]))];

    if (days.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">No hay menú para esta semana.</p>';
        return;
    }

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        const momentos = ["Desayuno", "Comida", "Cena"]; // Deben coincidir con tu Excel columna C
        
        momentos.forEach(m => {
            // Buscar fila donde Columna C (índice 2) coincide con el momento
            const found = dayRows.find(r => r[2] && r[2].trim() === m);
            
            // Si existe y tiene nombre de plato (Columna D / índice 3)
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
    
    document.getElementById('recipe-day-title').innerText = day;
    const container = document.getElementById('recipe-container');
    container.innerHTML = ''; 

    const momentos = ["Desayuno", "Comida", "Cena"];

    momentos.forEach(m => {
        const found = dayRows.find(r => r[2] === m);
        if (found) {
            // Columna 3: Nombre Plato, Columna 4: Receta/Pasos
            const nombrePlato = found[3] || "";
            const pasos = found[4] || "Consultar ingredientes.";

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

    // CONFIGURACIÓN DE COLUMNAS DE COMPRA
    // Índices basados en columna A=0. Ajusta si mueves columnas en Excel.
    // 5=F, 6=G, 7=H, 8=I, 9=J
    const pasillos = [
        { idx: 5, label: "Carnicería" },
        { idx: 6, label: "Pescadería" },
        { idx: 7, label: "Frutería" },
        { idx: 8, label: "Refrigerados" },
        { idx: 9, label: "Despensa" }
    ];

    // Lógica Modo Supermercado (Semana 3 y 4 juntas) o Semana Actual
    let rows = isSuper 
        ? allData.filter(r => (r[0] == 3 || r[0] == 4) && r[1].toLowerCase() !== 'dia') 
        : allData.filter(r => r[0] == currentWeek && r[1].toLowerCase() !== 'dia');

    pasillos.forEach(p => {
        // Filtrar celdas vacías
        let items = rows.filter(r => r[p.idx] && r[p.idx].trim() !== "");
        
        if (items.length > 0) {
            // Título del pasillo
            const h = document.createElement('h4');
            h.className = 'shopping-category-title';
            h.innerText = p.label;
            list.appendChild(h);
            
            items.forEach((item, i) => {
                // ID único para guardar el estado del checkbox
                // Usa Semana + Columna + Índice + Primeras letras del item para ser único
                const cleanName = item[p.idx].replace(/[^a-zA-Z0-9]/g, '');
                const uniqueId = `chk-w${item[0]}-${p.idx}-${i}-${cleanName.slice(0,8)}`;
                
                const isChecked = localStorage.getItem(uniqueId) === 'true';
                
                const div = document.createElement('div');
                div.className = 'shopping-item';
                
                div.innerHTML = `
                    <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
                    <label for="${uniqueId}" style="flex:1; ${isChecked ? 'text-decoration:line-through; opacity:0.5' : ''}">
                        ${isSuper ? `<span style="color:#000; font-weight:800; font-size:0.8em; margin-right:5px;">S${item[0]}</span>` : ''}
                        ${item[p.idx]}
                    </label>
                `;
                
                // Evento Checkbox
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
    
    if (list.innerHTML === '') {
        list.innerHTML = '<p style="text-align:center; padding:30px; color:#aaa;">Nada que comprar esta semana.</p>';
    }
}

function changeWeek(d) {
    // Evita semanas negativas, ajusta según tu duración del plan
    const newWeek = currentWeek + d;
    if (newWeek < 1) return; 
    
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
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    // Desactivar todos los botones
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    
    // Activar contenido y botón seleccionado
    document.getElementById(`${tabId}-view`).classList.add('active');
    
    // Encontrar el botón que tiene el onclick correspondiente
    const buttons = document.querySelectorAll('.tab-link');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

// Funciones Placeholder para Peso (Lógica futura)
function enviarPeso() {
    const val = document.getElementById('weight-input').value;
    if(val) {
        document.getElementById('last-weight').innerText = val + ' kg';
        alert("Peso guardado localmente (simulado).");
    }
}
