const KEY = '5c8a4ac9551a41588d024990779707ee';

window.onload = () => {
  const rezultat = localStorage.getItem('rezultat');
  if (rezultat) {
    try {
      const saved = JSON.parse(rezultat);
      if (saved && saved.title) renderRecipe(saved);
    } catch (e) {
      localStorage.removeItem('rezultat');
    }
  }
};

function showLoading() {
  document.getElementById('loading').classList.add('visible');
  document.getElementById('recipe-card').classList.add('hidden');
}

function renderRecipe(r) {
  const getNutrient = (name) => {
    const found = r.nutrition?.nutrients?.find(n => n.name === name);
    return found ? `${Math.round(found.amount)}${found.unit}` : 'N/A';
  };

  document.getElementById('recipe-img').src = r.image || '';
  document.getElementById('recipe-img').alt = r.title || '';
  document.getElementById('recipe-title').textContent = r.title || '';
  document.getElementById('recipe-time').textContent = `${r.readyInMinutes} min`;
  document.getElementById('recipe-servings').textContent = `${r.servings} porții`;
  document.getElementById('n-calories').textContent = getNutrient('Calories');
  document.getElementById('n-protein').textContent = getNutrient('Protein');
  document.getElementById('n-carbs').textContent = getNutrient('Carbohydrates');
  document.getElementById('n-fat').textContent = getNutrient('Fat');
  document.getElementById('recipe-link').href = r.sourceUrl || '#';

  document.getElementById('loading').classList.remove('visible');
  document.getElementById('recipe-card').classList.remove('hidden');

  localStorage.setItem('rezultat', JSON.stringify(r));
}

async function search() {
  const q = document.getElementById('q').value;
  showLoading();

  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${q}&number=10&addRecipeNutrition=true&addRecipeInstructions=true&apiKey=${KEY}`);
  const data = await res.json();
  const r = data.results[Math.floor(Math.random() * data.results.length)];

  if (!r) {
    document.getElementById('loading').classList.add('hidden');
    return;
  }

  const history = JSON.parse(localStorage.getItem('istoric') || '[]');
  if (!history.includes(q)) history.unshift(q);
  localStorage.setItem('istoric', JSON.stringify(history.slice(0, 10)));

  renderRecipe(r);
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

async function ingredientSuggest() {
  const q = document.getElementById('q').value;
  const ghost = document.getElementById('ghost');

  if (q.length < 2) { ghost.value = ''; showHistory(); return; }

  const res = await fetch(`https://api.spoonacular.com/food/ingredients/autocomplete?query=${q}&number=1&apiKey=${KEY}`);
  const data = await res.json();

  if (!data.length) { ghost.value = ''; return; }

  const suggestion = data[0].name;
  ghost.value = suggestion.toLowerCase().startsWith(q.toLowerCase())
    ? suggestion
    : '';
}

function handleKey(e) {
  if (e.key === 'Tab' || e.key === 'ArrowRight') {
    const ghost = document.getElementById('ghost');
    if (ghost.value) {
      e.preventDefault();
      document.getElementById('q').value = ghost.value;
      ghost.value = '';
    }
  }
}

async function randomRecipe() {
  showLoading();

  const res = await fetch(`https://api.spoonacular.com/recipes/random?number=1&addRecipeNutrition=true&addRecipeInstructions=true&apiKey=${KEY}`);
  const data = await res.json();
  const r = data.recipes[0];

  if (!r) {
    document.getElementById('loading').classList.add('hidden');
    return;
  }

  renderRecipe(r);
}