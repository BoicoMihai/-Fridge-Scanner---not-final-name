const API_KEYS = [
  'b5c5cbce124744faaff1a8f13541ae45',
  '5c8a4ac9551a41588d024990779707ee',
  '09a712dad1d84012ad8e44508ea411b5',
];

let currentKeyIndex = 0;

async function fetchWithFallback(urlTemplate) {
  for (let i = currentKeyIndex; i < API_KEYS.length; i++) {
    const url = urlTemplate(API_KEYS[i]);
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'failure' || res.status === 402) {
        console.warn(`Cheia ${i + 1} epuizată, trec la următoarea...`);
        currentKeyIndex = i + 1;
        continue;
      }

      return data;
    } catch (e) {
      console.error(`Eroare cu cheia ${i + 1}:`, e);
      currentKeyIndex = i + 1;
    }
  }

  throw new Error('Toate cheile API sunt epuizate!');
}

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

  document.getElementById('recipe-card').innerHTML = `
    <img src="${r.image || ''}" alt="${r.title || ''}">
    <div class="recipe-body">
      <h2>${r.title || ''}</h2>
      <div class="recipe-meta">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span>${r.readyInMinutes} min</span>
        <span class="dot">·</span>
        <span>${r.servings} porții</span>
      </div>
      <div class="recipe-nutrients">
        <div class="nutrient-chip">
          <span class="n-icon">🔥</span>
          <span class="n-value">${getNutrient('Calories')}</span>
          <span class="n-label">Calorii</span>
        </div>
        <div class="nutrient-chip">
          <span class="n-icon">🥩</span>
          <span class="n-value">${getNutrient('Protein')}</span>
          <span class="n-label">Proteine</span>
        </div>
        <div class="nutrient-chip">
          <span class="n-icon">🍞</span>
          <span class="n-value">${getNutrient('Carbohydrates')}</span>
          <span class="n-label">Carbohidrați</span>
        </div>
        <div class="nutrient-chip">
          <span class="n-icon">🧈</span>
          <span class="n-value">${getNutrient('Fat')}</span>
          <span class="n-label">Grăsimi</span>
        </div>
      </div>
      <a href="${r.sourceUrl || '#'}" target="_blank" class="recipe-link">
        Vezi rețeta completă
      </a>
    </div>
  `;

  document.getElementById('loading').classList.remove('visible');
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('recipe-card').classList.remove('hidden');

  localStorage.setItem('rezultat', JSON.stringify(r));
}

async function search() {
  const q = document.getElementById('q').value;
  showLoading();

  try {
    const data = await fetchWithFallback(
      (key) => `https://api.spoonacular.com/recipes/complexSearch?query=${q}&number=10&addRecipeNutrition=true&addRecipeInstructions=true&apiKey=${key}`
    );

    const r = data.results[Math.floor(Math.random() * data.results.length)];
    if (!r) {
      document.getElementById('loading').classList.add('hidden');
      return;
    }

    const history = JSON.parse(localStorage.getItem('istoric') || '[]');
    if (!history.includes(q)) history.unshift(q);
    localStorage.setItem('istoric', JSON.stringify(history.slice(0, 10)));

    renderRecipe(r);
  } catch (e) {
    alert('Toate cheile API sunt epuizate. Încearcă mai târziu.');
    document.getElementById('loading').classList.add('hidden');
  }
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

  try {
    const data = await fetchWithFallback(
      (key) => `https://api.spoonacular.com/food/ingredients/autocomplete?query=${q}&number=1&apiKey=${key}`
    );

    if (!data.length) { ghost.value = ''; return; }

    const suggestion = data[0].name;
    if (suggestion.toLowerCase().startsWith(q.toLowerCase())) {
      ghost.value = q + suggestion.slice(q.length);
    } else {
      ghost.value = '';
    }
  } catch (e) {
    ghost.value = '';
  }
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

  try {
    const data = await fetchWithFallback(
      (key) => `https://api.spoonacular.com/recipes/random?number=1&includeNutrition=true&apiKey=${key}`
    );

    const r = data.recipes[0];
    if (!r) {
      document.getElementById('loading').classList.add('hidden');
      return;
    }

    renderRecipe(r);
  } catch (e) {
    alert('Toate cheile API sunt epuizate. Încearcă mai târziu.');
    document.getElementById('loading').classList.add('hidden');
  }
}