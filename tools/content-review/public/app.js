const CATEGORIES = [
  ['offer', 'Offers'],
  ['faction', 'Factions'],
  ['artifact', 'Artifacts'],
  ['lair', 'Lairs'],
  ['origin', 'Origins'],
  ['ending', 'Endings'],
  ['epithet', 'Epithets'],
  ['mechanic', 'Necrolexicon'],
  ['changelog', 'Changelog'],
  ['template', 'Shared wording'],
];

let allFields = [];
let activeCategory = 'offer';
let searchTerm = '';

const $ = (sel, el = document) => el.querySelector(sel);

async function loadContent() {
  $('#counts').textContent = 'Loading…';
  const res = await fetch('/api/content');
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) {
    // The loader fails while a content file is half-edited; say why instead of
    // leaving the page on "Loading…".
    $('#counts').textContent = 'Could not load content';
    $('#main').innerHTML = '';
    const pre = document.createElement('pre');
    pre.textContent = (data && data.error) || `HTTP ${res.status}`;
    $('#main').appendChild(pre);
    return;
  }
  allFields = data;
  renderSidebar();
  renderCounts();
  renderMain();
}

function renderCounts() {
  const total = allFields.length;
  const items = new Set(allFields.map((f) => f.category + '::' + f.itemId)).size;
  $('#counts').textContent = `${items} items · ${total} fields`;
}

function renderSidebar() {
  const nav = $('#sidebar');
  nav.innerHTML = '';
  for (const [key, label] of CATEGORIES) {
    const count = new Set(
      allFields.filter((f) => f.category === key).map((f) => f.itemId),
    ).size;
    const btn = document.createElement('button');
    btn.textContent = `${label} (${count})`;
    btn.className = key === activeCategory ? 'active' : '';
    btn.addEventListener('click', () => {
      activeCategory = key;
      renderSidebar();
      renderMain();
    });
    nav.appendChild(btn);
  }
}

function groupByItem(fields) {
  const groups = new Map();
  for (const f of fields) {
    const key = f.category + '::' + f.itemId;
    if (!groups.has(key)) {
      groups.set(key, { category: f.category, itemId: f.itemId, itemLabel: f.itemLabel, file: f.file, fields: [] });
    }
    groups.get(key).fields.push(f);
  }
  return [...groups.values()];
}

function matchesSearch(field) {
  if (!searchTerm) return true;
  const haystack = `${field.itemId} ${field.itemLabel} ${field.fieldPath} ${field.value}`.toLowerCase();
  return haystack.includes(searchTerm);
}

function renderMain() {
  const main = $('#main');
  main.innerHTML = '';

  const catFields = allFields.filter((f) => f.category === activeCategory);
  const filtered = searchTerm ? catFields.filter(matchesSearch) : catFields;
  const items = groupByItem(filtered);

  if (items.length === 0) {
    main.innerHTML = '<p style="color:var(--ink-dim)">No matches.</p>';
    return;
  }

  for (const item of items) {
    main.appendChild(renderCard(item));
  }
}

function renderCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  const head = document.createElement('div');
  head.className = 'card-head';
  head.innerHTML = `<span class="name">${escapeHtml(item.itemLabel)}</span><span class="id">${escapeHtml(item.itemId)} · ${escapeHtml(item.file)}</span>`;
  card.appendChild(head);

  // Pair up gamble success/failure fields so they render side by side.
  const rendered = new Set();
  for (const field of item.fields) {
    if (rendered.has(field.fieldPath)) continue;
    const successMatch = field.fieldPath.match(/^(options\[\d+\])\.successText$/);
    if (successMatch) {
      const failureField = item.fields.find((f) => f.fieldPath === `${successMatch[1]}.failureText`);
      if (failureField) {
        const row = document.createElement('div');
        row.className = 'options-row';
        row.appendChild(renderField(item, field));
        row.appendChild(renderField(item, failureField));
        card.appendChild(row);
        rendered.add(field.fieldPath);
        rendered.add(failureField.fieldPath);
        continue;
      }
    }
    card.appendChild(renderField(item, field));
    rendered.add(field.fieldPath);
  }

  return card;
}

function renderField(item, field) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const labelRow = document.createElement('div');
  labelRow.className = 'field-label';
  const left = document.createElement('span');
  left.textContent = field.fieldPath;
  const right = document.createElement('span');
  right.className = 'field-context';
  right.textContent = field.context || '';
  labelRow.appendChild(left);
  labelRow.appendChild(right);
  wrap.appendChild(labelRow);

  const valueEl = document.createElement('div');
  valueEl.className = 'field-value';
  valueEl.textContent = field.value;
  valueEl.tabIndex = 0;

  const statusEl = document.createElement('span');
  statusEl.className = 'status';

  const startEdit = () => {
    const textarea = document.createElement('textarea');
    textarea.value = field.value;
    wrap.replaceChild(textarea, valueEl);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const counter = document.createElement('span');
    counter.className = 'counter';
    labelRow.appendChild(counter);
    const updateCounter = () => {
      if (!field.budget) { counter.textContent = ''; return; }
      const len = textarea.value.length;
      const max = field.budget.max;
      const warnAt = field.budget.warnAt ?? max;
      counter.textContent = Number.isFinite(max) ? `${len} / ${max}` : `${len}`;
      counter.className = 'counter' + (len > max ? ' over' : len > warnAt ? ' warn' : '');
    };
    updateCounter();
    textarea.addEventListener('input', updateCounter);

    const finish = async (commit) => {
      textarea.removeEventListener('blur', onBlur);
      if (!commit || textarea.value === field.value) {
        wrap.replaceChild(valueEl, textarea);
        counter.remove();
        return;
      }
      const newValue = textarea.value;
      statusEl.textContent = 'saving…';
      statusEl.className = 'status';
      labelRow.appendChild(statusEl);
      try {
        const res = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: field.file, itemId: item.itemId, oldValue: field.value, newValue }),
        });
        const result = await res.json();
        if (!res.ok || result.error) throw new Error(result.error || 'save failed');
        field.value = result.confirmedValue;
        valueEl.textContent = field.value;
        statusEl.textContent = result.lintWarning ? 'saved (lint warning — see console)' : 'saved';
        statusEl.className = 'status saved';
        if (result.lintWarning) console.warn(result.lintWarning);
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.className = 'status error';
      }
      wrap.replaceChild(valueEl, textarea);
      counter.remove();
      setTimeout(() => { statusEl.textContent = ''; }, 4000);
    };

    const onBlur = () => finish(true);
    textarea.addEventListener('blur', onBlur);
    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(false);
      } else if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        textarea.blur();
      }
    });
  };

  valueEl.addEventListener('click', startEdit);
  valueEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); startEdit(); }
  });

  wrap.appendChild(valueEl);
  return wrap;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('#search').addEventListener('input', (ev) => {
  searchTerm = ev.target.value.trim().toLowerCase();
  renderMain();
});

$('#validate-btn').addEventListener('click', async () => {
  const panel = $('#validate-panel');
  const output = $('#validate-output');
  panel.hidden = false;
  output.textContent = 'Running scripts/validate-content.ts…';
  const res = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const result = await res.json();
  output.textContent = `exit code ${result.code}\n\n${result.output}`;
});
$('#validate-close').addEventListener('click', () => { $('#validate-panel').hidden = true; });

loadContent();
