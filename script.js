function renderWeek(weekNum) {
    document.getElementById('current-week-label').textContent = `Semana ${weekNum}`;
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    // Filtramos por semana
    const weekDays = menuData.filter(row => row.semana == weekNum);

    if (weekDays.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">No hay datos para la Semana ' + weekNum + '</div>';
        return;
    }

    weekDays.forEach(day => {
        // AQUI ESTA EL CAMBIO: Leemos la columna "desayuno"
        const desayuno = day.desayuno || day.Desayuno || "---"; 
        const comida = day.comida || day.Comida || "---";
        const cena = day.cena || day.Cena || "---";
        const dia = day.dia || day.Dia || day.Día || "";
        const isCheat = day.tipo && day.tipo.toLowerCase().includes('cheat');
        
        container.innerHTML += `
            <div class="day-item">
                <div class="day-header ${isCheat ? 'cheat-day' : ''}">
                    <span>${dia}</span>
                    ${isCheat ? '<span>⭐</span>' : ''}
                </div>
                <div class="day-body">
                    <div class="meal-row">
                        <span class="meal-label">Desayuno</span>
                        <div class="meal-text">${desayuno}</div>
                    </div>
                    
                    <div class="meal-row">
                        <span class="meal-label">Comida</span>
                        <div class="meal-text">${comida}</div>
                    </div>
                    
                    <div class="meal-row">
                        <span class="meal-label">Cena</span>
                        <div class="meal-text">${cena}</div>
                    </div>
                </div>
            </div>`;
    });
}
