// Añade esto al final de tu script.js o sustituye las funciones correspondientes

function renderShopping(weekNum) {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    const items = shoppingData.filter(row => row.semana == weekNum);
    
    if(items.length === 0) {
        list.innerHTML = '<li style="color:#888; padding:10px;">Nada que comprar esta semana</li>';
        return;
    }
    
    items.forEach((obj, index) => {
        const prod = obj.producto || obj.item || "---";
        // Creamos un ID único para cada producto basado en la semana y su nombre
        const itemId = `item-${weekNum}-${prod.replace(/\s+/g, '')}`;
        const isChecked = localStorage.getItem(itemId) === 'true';

        list.innerHTML += `
            <li>
                <input type="checkbox" id="${itemId}" ${isChecked ? 'checked' : ''} onchange="saveStatus('${itemId}', this.checked)">
                <label for="${itemId}">${prod}</label>
            </li>`;
    });

    // También aplicamos esto a los Básicos (opcional, ver paso 2)
    loadBasicsStatus();
}

// Función para guardar el estado en la memoria del navegador
window.saveStatus = function(id, isChecked) {
    localStorage.setItem(id, isChecked);
}

// Función para cargar los básicos manualmente
function loadBasicsStatus() {
    const basics = ['b1', 'b2', 'b3', 'b4'];
    basics.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = localStorage.getItem(id) === 'true';
            checkbox.onchange = (e) => saveStatus(id, e.target.checked);
        }
    });
}
