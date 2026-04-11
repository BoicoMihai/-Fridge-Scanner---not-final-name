const KEY = 'b5c5cbce124744faaff1a8f13541ae45';

window.onload = () => {
  const rezultat = localStorage.getItem('rezultat');
  if (rezultat) document.getElementById('out').innerHTML = rezultat;
};

async function search() {
  const q = document.getElementById('q').value;
  document.getElementById('out').innerHTML = 'Se încarcă';
  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${q}&number=10&addRecipeNutrition=true&addRecipeInstructions=true&apiKey=${KEY}`);
  const data = await res.json();
  const r = data.results[Math.floor(Math.random() * data.results.length)];

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
  const history = JSON.parse(localStorage.getItem('istoric') || '[]');
  if (!history.includes(q)) history.unshift(q);
  localStorage.setItem('istoric', JSON.stringify(history.slice(0, 10)));
  localStorage.setItem('rezultat', document.getElementById('out').innerHTML);
}

function showHistory() {
  const history = JSON.parse(localStorage.getItem('istoric') || '[]');
  const dropdown = document.getElementById('dropdown');
  if (!history.length) { dropdown.innerHTML = ''; return; }
  dropdown.innerHTML = history.map(item =>
    `<div style="margin: 4px;">
      <button onmousedown="selectItem('${item}')">${item}</button>
      <button onmousedown="deleteItem('${item}')">✕</button>
    </div>`
  ).join('');
}

function selectItem(val) {
  document.getElementById('q').value = val;
  document.getElementById('dropdown').innerHTML = '';
  search();
}

function hideHistory() {
  setTimeout(() => {
    document.getElementById('dropdown').innerHTML = '';
  }, 150);
}

function deleteItem(val) {
  let history = JSON.parse(localStorage.getItem('istoric') || '[]');
  history = history.filter(item => item !== val);
  localStorage.setItem('istoric', JSON.stringify(history));
  showHistory();
}