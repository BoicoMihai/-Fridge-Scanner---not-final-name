const KEY = 'b5c5cbce124744faaff1a8f13541ae45';

async function search() {
  const q = document.getElementById('q').value;
  document.getElementById('out').innerHTML = 'Se încarcă';
  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${q}&number=1&addRecipeNutrition=true&addRecipeInstructions=true&apiKey=${KEY}`);
  const data = await res.json();
  const r = data.results[0];

  if (!r) { document.getElementById('out').innerHTML = 'Nici o rețetă găsită'; return; }

  const getNutrient = (name) => {
    const found = r.nutrition?.nutrients?.find(n => n.name === name);
    return found ? `${Math.round(found.amount)}${found.unit}` : 'N/A';
  };

  const steps = r.analyzedInstructions?.[0]?.steps ?? [];
  const stepsHTML = steps.length
    ? `<ol>${steps.map(s => `<li>${s.step}</li>`).join('')}</ol>`
    : '<p>Nu există pași disponibili.</p>';

  document.getElementById('out').innerHTML = `
    <hr>
    <img src="${r.image}" width="300"><br>
    <h2>${r.title}</h2>
    <p>⏱ ${r.readyInMinutes} min | ${r.servings} porții</p>
    <p>
      🔥 Calorii: ${getNutrient('Calories')} &nbsp;|&nbsp;
      🥩 Proteine: ${getNutrient('Protein')} &nbsp;|&nbsp;
      🍞 Carbohidrați: ${getNutrient('Carbohydrates')} &nbsp;|&nbsp;
      🧈 Grăsimi: ${getNutrient('Fat')}
    </p>
    <h3>Pași</h3>
    ${stepsHTML}
    <a href="${r.sourceUrl}" target="_blank">Vezi rețeta completă</a>
  `;
}