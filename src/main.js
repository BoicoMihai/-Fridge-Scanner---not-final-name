const KEY = 'b5c5cbce124744faaff1a8f13541ae45';

async function search() {
  const q = document.getElementById('q').value;
  document.getElementById('out').innerHTML = 'Se încarcă';

  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${q}&number=1&addRecipeInformation=true&apiKey=${KEY}`);
  const data = await res.json();
  const r = data.results[0];

  if (!r) { document.getElementById('out').innerHTML = 'Nica'; return; }

  document.getElementById('out').innerHTML = `
    <hr>
    <img src="${r.image}" width="300"><br>
    <h2>${r.title}</h2>
    <p>⏱ ${r.readyInMinutes} min | ${r.servings} porții</p>
    <a href="${r.sourceUrl}" target="_blank">Vezi rețeta completă </a>
  `;
}