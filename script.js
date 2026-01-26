let allData = [];
let currentWeek = 3; // Puedes cambiar esto para probar otras semanas
// Asegúrate de que esta URL sea la correcta de "Archivo > Compartir > Publicar en la web"
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROs3rKkPkBRckXovNQ3q6FqNIeaTD47d82QbULNJRZCZfl4E-Ekc26Iiq3xpAoq46Nnp8G3UU9c6PD/pub?output=csv";

window.onload = fetchData;

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // Normalizamos saltos de línea y dividimos
        const lines = text.trim().split(/\r?\n/);

        if (lines.length === 0) return;

        // DETECCIÓN AUTOMÁTICA DE SEPARADOR
        // Si la primera línea tiene comas, usamos coma. Si no, punto y coma.
        const firstLine = lines[0];
        const separator = firstLine.includes(',') ? ',' : ';';
        
        // Regex dinámica según el separador detectado
        const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

        allData = lines.map(line => {
            // Dividimos y limpiamos comillas extra que añade CSV
            return line.split(regex).map(cell => cell.replace(/^["']|["']$/g, '').trim());
        });

        console.log("Datos cargados:", allData.slice(0, 2)); // Para depuración
        renderApp();
    } catch (e) {
        console.error("Error cargando Sheets:", e);
        alert("Error de conexión con la hoja de cálculo.");
    }
}

function renderMenu() {
    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    
    // Filtramos por semana y aseguramos que no sea la cabecera 'dia'
    const weekRows = allData.filter(r => r[0] == currentWeek && r[1] && r[1].toLowerCase() !== 'dia');
    
    // Obtenemos los días únicos
    const days = [...new Set(weekRows.map(r => r[1]))];

    days.forEach(day => {
        const dayRows = weekRows.filter(r => r[1] === day);
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let html = `<h3>${day}</h3>`;
        const momentos = ["Desayuno", "Comida", "Cena"];
        
        momentos.forEach(m => {
            // Buscamos la fila que corresponde al momento (ej: Desayuno)
            // r[2] es la columna del "Momento"
            const found = dayRows.find(r => r[2] && r[2].trim() === m);
            
            // r[3] es el nombre del plato. Verificamos que exista.
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
    container.innerHTML = ''; // Limpiamos contenido anterior

    const momentos = ["Desayuno", "Comida", "Cena"];

    momentos.forEach(m => {
        const found = dayRows.find(r => r[2] === m);
        if (found) {
            // Estructura: Col 3 = Nombre plato, Col 4 = Receta/Pasos
            const nombrePlato = found[3] || "Sin nombre";
            const pasos = found[4] || "Sin receta detallada.";

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

    // COLUMNAS (Ajusta estos índices si tu Excel cambia)
    // 5: Carnicería, 6: Pescadería, 7: Frutería, 8: Refrigerados, 9: Despensa
    const pasillos = [
        { idx: 5, label: "Carnicería" },
        { idx: 6, label: "Pescadería" },
        { idx: 7, label: "Frutería" },
        { idx: 8, label: "Refrigerados" },
        { idx: 9, label: "Despensa" }
    ];

    let rows = isSuper 
        ? allData.filter(r => (r[0] == 3 || r[0] == 4) && r[1].toLowerCase() !== 'dia') 
        : allData.filter(r => r[0] == currentWeek && r[1].toLowerCase() !== 'dia');

    pasillos.forEach(p => {
        // Filtramos items que no estén vacíos
        let items = rows.filter(r => r[p.idx] && r[p.idx].trim() !== "");
        
        if (items.length > 0) {
            const h = document.createElement('h4');
            h.innerText = p.label;
            h.style = "margin:20px 0 8px 0; font-size:0.75rem; color:#888; text-transform:uppercase;";
            list.appendChild(h);
            
            items.forEach((item, i) => {
                // Creamos un ID único para guardar el check en memoria
                const uniqueId = `chk-w${item[0]}-${p.idx}-${i}-${item[p.idx].replace(/\s/g, '').slice(0,5)}`;
                const checked = localStorage.getItem(uniqueId) === 'true';
                
                const li = document.createElement('li');
                li.style = "list-style:none; padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:10px;";
                
                li.innerHTML = `
                    <input type="checkbox" id="${uniqueId}" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${uniqueId}', this.checked)">
                    <label for="${uniqueId}" style="${checked ? 'text-decoration:line-through; opacity:0.5' : ''}">
                        ${isSuper ? `<small style="color:blue; font-weight:bold;">S${item[0]}</small> ` : ''}${item[p.idx]}
                    </label>
                `;
                
                // Añadimos evento para tachar visualmente al instante
                const input = li.querySelector('input');
                const label = li.querySelector('label');
                input.addEventListener('change', (e) => {
                    label.style.textDecoration = e.target.checked ? 'line-through' : 'none';
                    label.style.opacity = e.target.checked ? '0.5' : '1';
                });

                list.appendChild(li);
            });
        }
    });
}

function changeWeek(d) {
    currentWeek = Math.max(1, currentWeek + d);
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

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`${tab}-view`).classList.add('active');
    // Busca el botón que llamó a la función y actívalo (fix para event undefined)
    const buttons = document.querySelectorAll(`.tab-link`);
    buttons.forEach(b => {
        if(b.getAttribute('onclick').includes(tab)) b.classList.add('active');
    });
}
