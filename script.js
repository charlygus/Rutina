function openRecipe(day) {
    const dayRows = allData.filter(r => r.semana == currentWeek && r.dia === day);
    document.getElementById('recipe-day-title').innerText = day;
    const container = document.getElementById('recipe-container');
    container.innerHTML = '';

    const momentos = ["Desayuno", "Comida", "Cena"];
    momentos.forEach(m => {
        const r = dayRows.find(row => row.momento === m);
        if (r && r.plato) {
            container.innerHTML += `
                <div class="recipe-box">
                    <span class="recipe-tag">${m}</span>
                    <div class="recipe-name">${r.plato}</div>
                    <div class="recipe-text">${r.receta || "Sin pasos detallados."}</div>
                </div>`;
        }
    });
    document.getElementById('recipe-view').classList.add('active');
}
