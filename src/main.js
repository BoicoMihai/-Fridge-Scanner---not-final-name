const API_KEYS = [
  'b5c5cbce124744faaff1a8f13541ae45',
  '5c8a4ac9551a41588d024990779707ee',
  'a334225021db4ee7a438380be83eb510',
  '87ac6e7ac548478185dc66d45ec708de',
  '6a1ba82c0a0a4087ab4d9ea39589e899',
  '3434c85cdcb846c29edb24e4b0485378',
  '4c570afd44694a3589f485d8fea5d363',
];

let currentKeyIndex = 0;
let activeFilters = {};
let timeMin = 5;
let timeMax = 120;

const dietMapping = {
  'vegan': 'vegan',
  'vegetarian': 'vegetarian',
  'paleo': 'paleo',
  'keto': 'ketogenic',
};

const booleanMapping = {
  'gluten-free': 'glutenFree',
  'dairy-free': 'dairyFree',
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

  throw new Error('Toate cheile API sunt epuizate');
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
  initTimeSlider();
};

function initTimeSlider() {
  const container = document.getElementById('slider-container');
  const fill      = document.getElementById('slider-fill');
  const thumbMin  = document.getElementById('thumb-min');
  const thumbMax  = document.getElementById('thumb-max');
  const display   = document.getElementById('time-display');

  if (!container || !fill || !thumbMin || !thumbMax || !display) return;

  const MIN = 5, MAX = 120, GAP = 10;
  timeMin = MIN;
  timeMax = MAX;

  function pct(v) {
    return ((v - MIN) / (MAX - MIN)) * 100;
  }

  function valFromPct(p) {
    const raw = MIN + (p / 100) * (MAX - MIN);
    return Math.round(raw / 5) * 5;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function updateUI() {
    const lo = pct(timeMin);
    const hi = pct(timeMax);
    thumbMin.style.left = lo + '%';
    thumbMax.style.left = hi + '%';
    fill.style.left  = lo + '%';
    fill.style.width = (hi - lo) + '%';

    if (timeMin === MIN && timeMax === MAX) {
      display.textContent = 'any duration';
    } else if (timeMax === MAX) {
      display.textContent = `${timeMin}+ min`;
    } else {
      display.textContent = `${timeMin} – ${timeMax} min`;
    }
  }

  function startDrag(e, isMin) {
    e.preventDefault();
    const thumb = isMin ? thumbMin : thumbMax;
    thumb.classList.add('dragging');

    function onMove(ev) {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = container.getBoundingClientRect();
      let p = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      let v = valFromPct(p);

      if (isMin) {
        timeMin = clamp(v, MIN, timeMax - GAP);
      } else {
        timeMax = clamp(v, timeMin + GAP, MAX);
      }
      updateUI();
    }

    function onUp() {
      thumb.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  thumbMin.addEventListener('mousedown',  (e) => startDrag(e, true));
  thumbMin.addEventListener('touchstart', (e) => startDrag(e, true),  { passive: false });
  thumbMax.addEventListener('mousedown',  (e) => startDrag(e, false));
  thumbMax.addEventListener('touchstart', (e) => startDrag(e, false), { passive: false });

  updateUI();
}

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

function getNutrientFromRecipe(r, name) {
  const list = r.nutrition?.nutrients || r.nutrients || [];
  const found = list.find(n => n.name === name);
  return found ? `${Math.round(found.amount)}${found.unit}` : 'N/A';
}

function renderRecipe(r) {
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
        <span>${r.servings} servings</span>
      </div>
      <div class="recipe-nutrients">
        <div class="nutrient-chip">
          <img src="images/calories.png" alt="calorii" class="nutrient-icon">
          <span class="n-value">${getNutrientFromRecipe(r, 'Calories')}</span>
          <span class="n-label">Calories</span>
        </div>
        <div class="nutrient-chip">
          <img src="images/protein.png" alt="proteine" class="nutrient-icon">
          <span class="n-value">${getNutrientFromRecipe(r, 'Protein')}</span>
          <span class="n-label">Protein</span>
        </div>
        <div class="nutrient-chip">
          <img src="images/carbohydrates.png" alt="carbohidrați" class="nutrient-icon">
          <span class="n-value">${getNutrientFromRecipe(r, 'Carbohydrates')}</span>
          <span class="n-label">Carbohydrates</span>
        </div>
        <div class="nutrient-chip">
          <img src="images/grease.png" alt="grăsimi" class="nutrient-icon">
          <span class="n-value">${getNutrientFromRecipe(r, 'Fat')}</span>
          <span class="n-label">Grease</span>
        </div>
      </div>
      <a href="${r.sourceUrl || '#'}" target="_blank" class="recipe-link">
      See the full recipe
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
    const dietValues = Object.keys(activeFilters)
      .filter(key => activeFilters[key] && dietMapping[key])
      .map(key => dietMapping[key]);
      const ingredientsList = selectedIngredients.join(',');

    let url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(q)}&number=10`;

    if (ingredientsList) {
  url += `&includeIngredients=${encodeURIComponent(ingredientsList)}`;
}

    if (dietValues.length > 0) {
      url += `&diet=${dietValues[0]}`;
    }

    Object.keys(activeFilters).forEach(key => {
      if (activeFilters[key] && booleanMapping[key]) {
        url += `&${booleanMapping[key]}=true`;
      }
    });

    url += `&apiKey=`;

    const data = await fetchWithFallback((key) => url + key);

    const results = data.results;
    if (!results || results.length === 0) {
      document.getElementById('loading').classList.add('hidden');
      alert('Nu s-au găsit rețete cu aceste criterii');
      return;
    }

    const chosen = results[Math.floor(Math.random() * results.length)];

    const full = await fetchWithFallback(
      (key) => `https://api.spoonacular.com/recipes/${chosen.id}/information?includeNutrition=true&apiKey=${key}`
    );

    if (timeMin !== 5 || timeMax !== 120) {
      if (!full.readyInMinutes || full.readyInMinutes < timeMin || full.readyInMinutes > timeMax) {
        document.getElementById('loading').classList.add('hidden');
        alert('Nu s-au găsit rețete în intervalul de timp selectat');
        return;
      }
    }

    const history = JSON.parse(localStorage.getItem('istoric') || '[]');
    if (!history.includes(q)) history.unshift(q);
    localStorage.setItem('istoric', JSON.stringify(history.slice(0, 10)));

    renderRecipe(full);
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
    const url = `https://api.spoonacular.com/recipes/random?number=5&apiKey=`;
    const data = await fetchWithFallback((key) => url + key);

    const filtered = (data.recipes || []).filter(recipe => {
      const t = recipe.readyInMinutes;
      if (!t) return false;
      return t >= timeMin && t <= timeMax;
    });

    if (filtered.length === 0) {
      document.getElementById('loading').classList.add('hidden');
      alert('Nu s-au găsit rețete în intervalul de timp selectat');
      return;
    }

    const chosen = filtered[Math.floor(Math.random() * filtered.length)];

    const full = await fetchWithFallback(
      (key) => `https://api.spoonacular.com/recipes/${chosen.id}/information?includeNutrition=true&apiKey=${key}`
    );

    renderRecipe(full);
  } catch (e) {
    alert('Toate cheile API sunt epuizate');
    document.getElementById('loading').classList.add('hidden');
  }
}

function toggleFilters() {
  const container = document.getElementById('filters-container');
  container.classList.toggle('hidden');
  const arrow = document.getElementById('toggle-arrow');
  arrow.classList.toggle('open');
}

function togglePill(btn) {
  const filterId = btn.dataset.filter;
  const isActive = btn.classList.toggle('active');
  if (isActive) activeFilters[filterId] = true;
  else delete activeFilters[filterId];
  localStorage.setItem('active_filters', JSON.stringify(activeFilters));
  displayActiveFilters();
}

function updateFilters() {
  activeFilters = {};
  const allKeys = [...Object.keys(dietMapping), ...Object.keys(booleanMapping)];
  allKeys.forEach(filterId => {
    const pill = document.querySelector(`.filter-pill[data-filter="${filterId}"]`);
    if (pill && pill.classList.contains('active')) {
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
      if (value) {
        const pill = document.querySelector(`.filter-pill[data-filter="${filterId}"]`);
        if (pill) pill.classList.add('active');
      }
    });
    displayActiveFilters();
  }
}

function displayActiveFilters() {
  const container = document.getElementById('active-filters');
  if (!container) return;
  const activeList = Object.keys(activeFilters).filter(key => activeFilters[key]);
  if (activeList.length === 0) {
    container.innerHTML = '';
    return;
  }

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
  const pill = document.querySelector(`.filter-pill[data-filter="${filterId}"]`);
  if (pill) pill.classList.remove('active');
  delete activeFilters[filterId];
  localStorage.setItem('active_filters', JSON.stringify(activeFilters));
  displayActiveFilters();
}

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
            <span>${recipe.servings} porții</span>
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
  updateFavoriteButton(recipeId);
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('favorites-modal');
  if (modal && e.target === modal) {
    closeFavorites();
  }
});

let asideOpen = false;

function toggleAsidePanel() {
  asideOpen = !asideOpen;
  const aside = document.getElementById('ingredients-aside');
  const btn = document.getElementById('btn-open-aside');

  if (asideOpen) {
    aside.classList.remove('hidden');
    btn.classList.add('active');
  } else {
    aside.classList.add('hidden');
    btn.classList.remove('active');
  }
}

function selectIngredient(name, pillEl) {
  pillEl.classList.toggle('selected');
}

function toggleAside() {
  const extra  = document.getElementById('aside-extra');
  const arrow  = document.getElementById('see-more-arrow');
  const btn    = document.getElementById('see-more-btn');
  const aside  = document.getElementById('ingredients-aside');
  const isOpen = !extra.classList.contains('hidden');

  if (isOpen) {
    extra.classList.add('hidden');
    arrow.classList.remove('open');
    btn.childNodes[0].textContent = 'See more ';
    aside.classList.remove('expanded');
  } else {
    extra.classList.remove('hidden');
    arrow.classList.add('open');
    btn.childNodes[0].textContent = 'See less ';
    aside.classList.add('expanded');
  }
}

let selectedIngredients = [];

function selectIngredient(name, pillEl) {
  const index = selectedIngredients.indexOf(name);
  
  if (index > -1) {
    selectedIngredients.splice(index, 1);
    pillEl.classList.remove('selected');
  } else {
    selectedIngredients.push(name);
    pillEl.classList.add('selected');
  }
  
  renderIngredientTags();
}

function renderIngredientTags() {
  const container = document.getElementById('ingredient-tags');
  
  if (selectedIngredients.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = selectedIngredients.map(name => `
    <span class="ingredient-tag">
      ${name}
      <button onclick="removeIngredientTag('${name}')">✕</button>
    </span>
  `).join('');
}

function removeIngredientTag(name) {
  selectedIngredients = selectedIngredients.filter(i => i !== name);
  document.querySelectorAll('.aside-pill').forEach(pill => {
    if (pill.textContent.trim().toLowerCase() === name.toLowerCase()) {
      pill.classList.remove('selected');
    }
  });
  renderIngredientTags();
}