let planData = null;
let currentWeekIndex = 0;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            planData = data;
            loadWeek(0);
            loadBreakfasts();
        })
        .catch(error => console.error('Error cargando el plan:', error));

    // Event Listeners Botones
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
});

function changeWeek(direction) {
    if (!planData) return;
    const newIndex = currentWeekIndex + direction;
    if (newIndex >= 0 && newIndex < planData.weeks.length) {
        currentWeekIndex = newIndex;
        loadWeek(currentWeekIndex);
    }
}

function loadWeek(index) {
    const week = planData.weeks[index];
    document.getElementById('current-week-label').textContent = week.name;

    // Renderizar Días
    const daysContainer = document.getElementById('days-container');
    daysContainer.innerHTML = '';

    week.days.forEach(day => {
        const isCheat = day.type === 'cheat';
        const html = `
            <div class="day-item">
                <div class="day-header ${isCheat ? 'cheat-day' : ''}">
                    <span>${day.name}</span>
                    ${isCheat ? '<i class="fas fa-star"></i>' : ''}
                </div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${day.lunch}</div>
                    </div>
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${day.dinner}</div>
                    </div>
                </div>
            </div>
        `;
        daysContainer.innerHTML += html;
    });

    // Renderizar Lista de Compra
    const shoppingList = document.getElementById('shopping-list');
    shoppingList.innerHTML = '';
    week.shopping_list.forEach(item => {
        shoppingList.innerHTML += `<li><input type="checkbox"> ${item}</li>`;
    });
}

function loadBreakfasts() {
    const list = document.getElementById('breakfast-list');
    planData.breakfasts.forEach(item => {
        list.innerHTML += `<li>${item}</li>`;
    });
}

// Control de Pestañas
window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabName + '-view').classList.add('active');
    // Buscar el botón que llamó a la función no es fácil sin pasar 'this', 
    // así que lo hacemos simple seleccionando por orden o texto.
    const buttons = document.querySelectorAll('.tab-btn');
    if(tabName === 'menu') buttons[0].classList.add('active');
    else buttons[1].classList.add('active');
};
