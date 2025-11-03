// dom-utils.js
export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

export function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

export function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}