let allData = [];
let currentWeek = 3; // Semana por defecto

async function fetchData() {
    // Reemplaza con tu URL de Google Sheets (formato CSV)
    const url = "TU_URL_DE_GOOGLE_SHEETS_AQUÍ"; 
    
    try {
        const response = await fetch(url);
        const data = await response.text();
        // Parseamos usando el separador de barra vertical | que usamos en el Excel
        allData = data.split('\n').map(row => row.split('|'));
        renderApp();
    } catch (error) {
        console.error("Error al cargar los datos:", error);
    }
}

function renderApp() {
    renderMenu();
    renderShopping();
}

// --- LÓGICA DEL MENÚ ---
function renderMenu() {
    const menuContainer = document.getElementById('menu-list');
    menuContainer.innerHTML = '';

    // Filtramos las filas que pertenecen a la semana seleccionada
    // row[0] es 'semana', row[1] es 'dia', row[3] es 'plato'...
    const weekData = allData.filter(row => row[0] == currentWeek && row[1] !== 'dia');

    weekData.forEach((row, index) => {
        if (row[3] === 'LIBRE') {
            menuContainer.innerHTML += `
                <div class="card cheat-day">
                    <h4>${row[1]} - ${row[2]}</h4>
                    <p>✨ ¡DÍA LIBRE! A disfrutar.</p>
                </div>`;
            return;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span>${row[1]} - ${row[2]}</span>
                <span class="type-tag">${row[3]}</span>
            </div>
            <button onclick="openModal('${row[3]}', '${row[4]}')">Ver Receta</button>
        `;
        menuContainer.appendChild(card);
    });
}

// --- LÓGICA DE LA COMPRA (LA REVOLUCIÓN) ---
function renderShopping() {
    const shopContainer = document.getElementById('shopping-list');
    shopContainer.innerHTML = '';
    
    const isSuperMode = document.getElementById('supermarket-mode')?.checked;
    
    // Definimos los nombres de las columnas de pasillos
    const pasillos = [
        { idx: 5, nombre: "🥩 Carnicería", class: "cat-meat" },
        { idx: 6, nombre: "🐟 Pescadería", class: "cat-fish" },
        { idx: 7, nombre: "🥦 Frutería", class: "cat-veg" },
        { idx: 8, nombre: "❄️ Refrigerados", class: "cat-cold" },
        { idx: 9, nombre: "🥫 Despensa", class: "cat-shelf" }
    ];

    // Si Modo Super: S3 + S4. Si no: solo currentWeek.
    let items = isSuperMode 
        ? allData.filter(row => row[0] == 3 || row[0] == 4)
        : allData.filter(row => row[0] == currentWeek);

    pasillos.forEach(pasillo => {
        // Buscamos si hay algo en esta columna (pasillo) para las filas seleccionadas
        const itemsEnPasillo = [];
        
        items.forEach(row => {
            const contenido = row[pasillo.idx]?.trim();
            if (contenido && contenido !== pasillo.nombre && contenido !== "") {
                itemsEnPasillo.push({
                    nombre: contenido,
                    semana: row[0],
                    plato: row[3]
                });
            }
        });

        if (itemsEnPasillo.length > 0) {
            // Creamos el título del pasillo
            const section = document.createElement('div');
            section.className = `shop-section ${pasillo.class}`;
            section.innerHTML = `<h5>${pasillo.nombre}</h5>`;
            
            const ul = document.createElement('ul');
            itemsEnPasillo.forEach(item => {
                const uniqueId = `check-${item.semana}-${item.nombre.replace(/\s+/g, '')}`;
                const isChecked = localStorage.getItem(uniqueId) === 'true';
                
                const li = document.createElement('li');
                li.innerHTML = `
                    <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''} onchange="toggleCheck('${uniqueId}', this)">
                    <label for="${uniqueId}">
                        <strong>${item.nombre}</strong>
                        ${isSuperMode ? `<small>(S${item.semana})</small>` : `<small>${item.plato}</small>`}
                    </label>
                `;
                ul.appendChild(li);
            });
            section.appendChild(ul);
            shopContainer.appendChild(section);
        }
    });
}

function toggleCheck(id, el) {
    localStorage.setItem(id, el.checked);
    // Opcional: tachado visual inmediato
    el.parentElement.style.opacity = el.checked ? '0.5' : '1';
}

function changeWeek(week) {
    currentWeek = week;
    document.querySelectorAll('.week-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderApp();
}

// Iniciar
fetchData();
