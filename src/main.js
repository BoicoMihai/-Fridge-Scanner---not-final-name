const API_KEYS = [
  'b5c5cbce124744faaff1a8f13541ae45',
  '5c8a4ac9551a41588d024990779707ee',
  '09a712dad1d84012ad8e44508ea411b5',
];

let currentKeyIndex = 0;
let activeFilters = {};

const filterMapping = {
  'vegan': 'vegan',
  'vegetarian': 'vegetarian',
  'gluten-free': 'glutenFree',
  'dairy-free': 'dairyFree',
  'paleo': 'paleo',
  'keto': 'ketogenic'
};

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
  loadFiltersFromStorage();
};

function showLoading() {
  document.getElementById('loading').classList.add('visible');
  document.getElementById('recipe-card').classList.add('hidden');
}

function isFavorited(recipeId) {
  const favorites = JSON.parse(localStorage.getItem('favorite_recipes') || '[]');
  return favorites.some(r => r.id === recipeId);
}

function toggleFavorite(recipe) {
  let favorites = JSON.parse(localStorage.getItem('favorite_recipes') || '[]');
  const index = favorites.findIndex(r => r.id === recipe.id);

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(recipe);
  }

  localStorage.setItem('favorite_recipes', JSON.stringify(favorites));
  updateFavoriteButton(recipe.id);
}

function updateFavoriteButton(recipeId) {
  const btn = document.getElementById('favorite-btn');
  if (btn) {
    const isFav = isFavorited(recipeId);
    btn.classList.toggle('favorited', isFav);
    btn.innerHTML = `<img src="images/${isFav ? 'heart' : 'no-heart'}.png" alt="favorite" width="16" height="16">`;
  }
}

function renderRecipe(r) {
  const getNutrient = (name) => {
    const found = r.nutrition?.nutrients?.find(n => n.name === name);
    return found ? `${Math.round(found.amount)}${found.unit}` : 'N/A';
  };

  const isFav = isFavorited(r.id);

  document.getElementById('recipe-card').innerHTML = `
    <div class="recipe-header">
      <img src="${r.image || ''}" alt="${r.title || ''}">
      ${r.spoonacularScore != null ? `
      <div class="score-badge">
        <img src="images/star.png" alt="score" width="14" height="14">
        <span>${Math.round(r.spoonacularScore)}<span style="opacity:0.5;font-weight:300">/100</span></span>
      </div>` : ''}
      <button id="favorite-btn" class="favorite-btn ${isFav ? 'favorited' : ''}" onclick="toggleFavorite(${JSON.stringify(r).replace(/"/g, '&quot;')})">
        <img src="images/${isFav ? 'heart' : 'no-heart'}.png" width="16" height="16">
      </button>
    </div>
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
          <img src="images/calories.png" alt="calorii" class="nutrient-icon">
          <span class="n-value">${getNutrient('Calories')}</span>
          <span class="n-label">Calorii</span>
        </div>
        <div class="nutrient-chip">
          <img src="images/protein.png" alt="proteine" class="nutrient-icon">
          <span class="n-value">${getNutrient('Protein')}</span>
          <span class="n-label">Proteine</span>
        </div>
        <div class="nutrient-chip">
          <img src="images/carbohydrates.png" alt="carbohidrați" class="nutrient-icon">
          <span class="n-value">${getNutrient('Carbohydrates')}</span>
          <span class="n-label">Carbohidrați</span>
        </div>
        <div class="nutrient-chip">
          <img src="images/grease.png" alt="grăsimi" class="nutrient-icon">
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
    let url = `https://api.spoonacular.com/recipes/complexSearch?query=${q}&number=10&addRecipeNutrition=true&addRecipeInstructions=true`;
    
    // Add dietary filters to URL
    Object.entries(filterMapping).forEach(([key, apiParam]) => {
      if (activeFilters[key]) {
        url += `&${apiParam}=true`;
      }
    });

    url += `&apiKey=`;

    const data = await fetchWithFallback((key) => url + key);

    const r = data.results[Math.floor(Math.random() * data.results.length)];
    if (!r) {
      document.getElementById('loading').classList.add('hidden');
      alert('Nu s-au găsit rețete cu aceste criterii. Încearcă alte preferințe.');
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

// -------FILTERS------- //
function toggleFilters() {
  const container = document.getElementById('filters-container');
  container.classList.toggle('hidden');
  const btn = document.querySelector('.toggle-filters');
  btn.style.transform = container.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function updateFilters() {
  activeFilters = {};
  Object.keys(filterMapping).forEach(filterId => {
    const checkbox = document.getElementById(filterId);
    if (checkbox && checkbox.checked) {
      activeFilters[filterId] = true;
    }
  });
  localStorage.setItem('active_filters', JSON.stringify(activeFilters));
  displayActiveFilters();
}

function loadFiltersFromStorage() {
  const saved = localStorage.getItem('active_filters');
  if (saved) {
    activeFilters = JSON.parse(saved);
    Object.entries(activeFilters).forEach(([filterId, value]) => {
      const checkbox = document.getElementById(filterId);
      if (checkbox) checkbox.checked = value;
    });
    displayActiveFilters();
  }
}

function displayActiveFilters() {
  const container = document.getElementById('active-filters');
  const activeList = Object.keys(activeFilters).filter(key => activeFilters[key]);
  
  if (activeList.length === 0) {
    container.innerHTML = '';
    return;
  }

  const filterLabels = {
    'vegan': '🌱 Vegan',
    'vegetarian': '🥬 Vegetarian',
    'gluten-free': '🌾 Fără Gluten',
    'dairy-free': '🥛 Fără Lactate',
    'paleo': '🍖 Paleo',
    'keto': '⚡ Keto'
  };

  container.innerHTML = `<div class="filters-display">
    ${activeList.map(key => `
      <span class="filter-tag">
        ${filterLabels[key]}
        <button onclick="removeFilter('${key}')" class="remove-filter">✕</button>
      </span>
    `).join('')}
  </div>`;
}

function removeFilter(filterId) {
  const checkbox = document.getElementById(filterId);
  if (checkbox) {
    checkbox.checked = false;
    updateFilters();
  }
}

// -------FAVORITES------- //
function showFavorites() {
  const favorites = JSON.parse(localStorage.getItem('favorite_recipes') || '[]');
  const modal = document.getElementById('favorites-modal');
  const list = document.getElementById('favorites-list');

  if (favorites.length === 0) {
    list.innerHTML = '<p class="no-favorites">Nu ai salvat nicio rețetă.</p>';
  } else {
    list.innerHTML = favorites.map(recipe => `
      <div class="favorite-item">
        <div class="favorite-item-image">
          <img src="${recipe.image || ''}" alt="${recipe.title}">
        </div>
        <div class="favorite-item-info">
          <h3>${recipe.title}</h3>
          <p class="favorite-meta">
            <span>⏱ ${recipe.readyInMinutes} min</span>
            <span class="dot">·</span>
            <span>🍽 ${recipe.servings} porții</span>
          </p>
        </div>
        <div class="favorite-item-actions">
          <button class="view-recipe-btn" onclick="loadFavorite(${JSON.stringify(recipe).replace(/"/g, '&quot;')})">
            Vezi
          </button>
          <button class="remove-favorite-btn" onclick="removeFavorite(${recipe.id})">
            ✕
          </button>
        </div>
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
}

function closeFavorites() {
  document.getElementById('favorites-modal').classList.add('hidden');
}

function loadFavorite(recipe) {
  closeFavorites();
  renderRecipe(recipe);
  document.querySelector('.hero').scrollIntoView({ behavior: 'smooth' });
}

function removeFavorite(recipeId) {
  let favorites = JSON.parse(localStorage.getItem('favorite_recipes') || '[]');
  favorites = favorites.filter(r => r.id !== recipeId);
  localStorage.setItem('favorite_recipes', JSON.stringify(favorites));
  showFavorites();
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('favorites-modal');
  if (modal && e.target === modal) {
    closeFavorites();
  }
});