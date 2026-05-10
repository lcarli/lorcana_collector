const TABS = [
  { id: "pins", label: "Pins", file: "data/pins.json", hasNumber: false },
  { id: "playmats", label: "Playmats", file: "data/playmats.json", hasNumber: false },
  { id: "lore-counters", label: "Lore Counters", file: "data/lore-counters.json", hasNumber: false },
  { id: "promo-cards", label: "Cartas Promo", file: "data/promo-cards.json", hasNumber: true },
  { id: "continuum-art", label: "Continuum Art", file: "data/continuum-art.json", hasNumber: true },
  { id: "sleeves", label: "Sleeves", file: "data/sleeves.json", hasNumber: false },
  { id: "stickers", label: "Stickers", file: "data/stickers.json", hasNumber: false },
  { id: "deck-box", label: "Deck Box", file: "data/deck-box.json", hasNumber: false },
  { id: "boxes", label: "Boxes", file: "data/boxes.json", hasNumber: false },
  { id: "portfolio", label: "Portfolio", file: "data/portfolio.json", hasNumber: false },
  { id: "others", label: "Outros", file: "data/others.json", hasNumber: false },
];

const STORAGE_KEY = "lorcana_collection_owned_v1";
const dataCache = {};
let currentTab = "pins";
let owned = loadOwned();

function loadOwned() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    // Migrate old "book" tab data to "portfolio"
    if (data.book && !data.portfolio) {
      data.portfolio = data.book;
      delete data.book;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    return data;
  } catch {
    return {};
  }
}

function saveOwned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(owned));
  scheduleRemotePush();
}

// =================== Cloud Sync (GitHub Gist) ===================

const SYNC_KEY = "lorcana_collection_sync_v1";
const GIST_FILENAME = "lorcana-collection.json";
let syncCfg = loadSyncCfg();
let pushTimer = null;
let pushing = false;
let pushQueued = false;

function loadSyncCfg() {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; }
  catch { return {}; }
}
function saveSyncCfg() { localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg)); }

function setSyncStatus(text, kind = "") {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "sync-status " + kind;
}

function gistHeaders() {
  return {
    "Authorization": `Bearer ${syncCfg.token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function pullFromGist() {
  if (!syncCfg.gistId || !syncCfg.token) return;
  setSyncStatus("Sincronizando...", "pending");
  try {
    const r = await fetch(`https://api.github.com/gists/${syncCfg.gistId}`, {
      headers: gistHeaders(), cache: "no-store",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const gist = await r.json();
    const file = gist.files && gist.files[GIST_FILENAME];
    if (!file) throw new Error(`Arquivo ${GIST_FILENAME} não encontrado no gist`);
    let content = file.content;
    if (file.truncated && file.raw_url) {
      const rr = await fetch(file.raw_url, { cache: "no-store" });
      content = await rr.text();
    }
    const remote = content.trim() ? JSON.parse(content) : {};
    if (typeof remote !== "object" || Array.isArray(remote)) throw new Error("Formato inválido no gist");
    owned = remote;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(owned));
    syncCfg.lastSync = new Date().toISOString();
    saveSyncCfg();
    setSyncStatus("✓ Sincronizado", "ok");
    return true;
  } catch (e) {
    setSyncStatus("⚠ Erro: " + e.message, "err");
    return false;
  }
}

async function pushToGist() {
  if (!syncCfg.gistId || !syncCfg.token) return;
  if (pushing) { pushQueued = true; return; }
  pushing = true;
  setSyncStatus("Salvando...", "pending");
  try {
    const r = await fetch(`https://api.github.com/gists/${syncCfg.gistId}`, {
      method: "PATCH",
      headers: { ...gistHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content: JSON.stringify(owned, null, 2) } },
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    syncCfg.lastSync = new Date().toISOString();
    saveSyncCfg();
    setSyncStatus("✓ Sincronizado", "ok");
  } catch (e) {
    setSyncStatus("⚠ Erro: " + e.message, "err");
  } finally {
    pushing = false;
    if (pushQueued) { pushQueued = false; pushToGist(); }
  }
}

function scheduleRemotePush() {
  if (!syncCfg.gistId || !syncCfg.token) return;
  setSyncStatus("Alterado (salvando em 2s)...", "pending");
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToGist, 2000);
}

// Flush pending push before leaving the page (best-effort)
window.addEventListener("beforeunload", () => {
  if (pushTimer) {
    clearTimeout(pushTimer);
    if (navigator.sendBeacon && syncCfg.gistId && syncCfg.token) {
      // sendBeacon doesn't allow custom auth headers reliably; just attempt sync fetch
      try {
        fetch(`https://api.github.com/gists/${syncCfg.gistId}`, {
          method: "PATCH",
          headers: { ...gistHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            files: { [GIST_FILENAME]: { content: JSON.stringify(owned, null, 2) } },
          }),
          keepalive: true,
        });
      } catch {}
    }
  }
});

function isOwned(tabId, itemId) {
  return !!(owned[tabId] && owned[tabId][itemId]);
}

function setOwned(tabId, itemId, value) {
  if (!owned[tabId]) owned[tabId] = {};
  if (value) owned[tabId][itemId] = true;
  else delete owned[tabId][itemId];
  saveOwned();
}

async function loadTabData(tab) {
  if (dataCache[tab.id]) return dataCache[tab.id];
  try {
    const resp = await fetch(tab.file, { cache: "no-store" });
    if (!resp.ok) throw new Error(resp.statusText);
    const data = await resp.json();
    dataCache[tab.id] = data;
    return data;
  } catch (e) {
    dataCache[tab.id] = [];
    return [];
  }
}

function groupBySet(items) {
  const groups = new Map();
  for (const it of items) {
    const key = it.set || "Outros";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return groups;
}

function matchesFilter(item, query, onlyMissing, tabId) {
  if (onlyMissing && isOwned(tabId, item.id)) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (item.name || "").toLowerCase().includes(q) ||
    (item.set || "").toLowerCase().includes(q) ||
    (item.number ? String(item.number).toLowerCase().includes(q) : false)
  );
}

async function renderTab() {
  const tab = TABS.find((t) => t.id === currentTab);
  const main = document.getElementById("content");
  main.dataset.tab = tab.id;
  main.innerHTML = '<p class="loading">Carregando...</p>';

  const items = await loadTabData(tab);
  if (!items.length) {
    main.innerHTML = `<p class="empty">Nenhum item cadastrado nesta aba ainda.</p>`;
    return;
  }

  const query = document.getElementById("search").value.trim();
  const onlyMissing = document.getElementById("onlyMissing").checked;
  const filtered = items.filter((it) => matchesFilter(it, query, onlyMissing, tab.id));

  const totalOwned = items.filter((it) => isOwned(tab.id, it.id)).length;
  const total = items.length;
  const pct = total ? Math.round((totalOwned / total) * 100) : 0;

  const groups = groupBySet(filtered);

  let html = `
    <div class="progress">
      <strong>${tab.label}</strong>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <span>${totalOwned} / ${total} (${pct}%)</span>
    </div>
  `;

  if (!filtered.length) {
    html += `<p class="empty">Nada encontrado.</p>`;
  } else {
    for (const [setName, list] of groups) {
      html += `<section class="set-group"><h2>${escapeHtml(setName)}</h2><div class="grid">`;
      for (const it of list) {
        const ownedClass = isOwned(tab.id, it.id) ? "owned" : "";
        const numberHtml = tab.hasNumber && it.number
          ? `<div class="number">#${escapeHtml(it.number)}</div>`
          : "";
        html += `
          <div class="card ${ownedClass}" data-id="${escapeAttr(it.id)}">
            <img src="${escapeAttr(it.image)}" alt="${escapeAttr(it.name)}" loading="lazy" />
            <div class="name">${escapeHtml(it.name)}</div>
            ${numberHtml}
          </div>
        `;
      }
      html += `</div></section>`;
    }
  }

  main.innerHTML = html;

  main.querySelectorAll(".card").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      const next = !isOwned(tab.id, id);
      setOwned(tab.id, id, next);
      el.classList.toggle("owned", next);
      // refresh progress only
      const newOwned = items.filter((it) => isOwned(tab.id, it.id)).length;
      const newPct = total ? Math.round((newOwned / total) * 100) : 0;
      const bar = main.querySelector(".progress .bar > div");
      const span = main.querySelector(".progress span");
      if (bar) bar.style.width = newPct + "%";
      if (span) span.textContent = `${newOwned} / ${total} (${newPct}%)`;
      // if onlyMissing is on, re-render to drop the just-marked card
      if (document.getElementById("onlyMissing").checked && next) {
        renderTab();
      }
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
}
function escapeAttr(s) { return escapeHtml(s); }

// Tabs
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;
    renderTab();
  });
});

// Filters
document.getElementById("search").addEventListener("input", renderTab);
document.getElementById("onlyMissing").addEventListener("change", renderTab);

// Export / Import
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(owned, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lorcana-collection.json";
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Formato inválido");
    owned = parsed;
    saveOwned();
    renderTab();
    alert("Importado com sucesso.");
  } catch (err) {
    alert("Erro ao importar: " + err.message);
  }
  e.target.value = "";
});

renderTab();

// =================== Sync UI wiring ===================
const syncDialog = document.getElementById("syncDialog");
const gistIdInput = document.getElementById("gistIdInput");
const gistTokenInput = document.getElementById("gistTokenInput");
const dialogStatus = document.getElementById("syncDialogStatus");

function setDialogStatus(msg, kind = "") {
  dialogStatus.textContent = msg;
  dialogStatus.style.color = kind === "ok" ? "var(--owned-border)"
    : kind === "err" ? "#ff6b6b" : "var(--muted)";
}

document.getElementById("syncBtn").addEventListener("click", () => {
  gistIdInput.value = syncCfg.gistId || "";
  gistTokenInput.value = syncCfg.token || "";
  setDialogStatus(syncCfg.lastSync ? `Última sincronização: ${new Date(syncCfg.lastSync).toLocaleString()}` : "");
  if (typeof syncDialog.showModal === "function") syncDialog.showModal();
  else syncDialog.setAttribute("open", "");
});

document.getElementById("syncCloseBtn").addEventListener("click", () => syncDialog.close());

document.getElementById("syncSaveBtn").addEventListener("click", async () => {
  const gistId = gistIdInput.value.trim();
  const token = gistTokenInput.value.trim();
  if (!gistId || !token) { setDialogStatus("Preencha Gist ID e Token.", "err"); return; }
  syncCfg = { gistId, token };
  saveSyncCfg();
  setDialogStatus("Conectando e puxando do gist...", "");
  const ok = await pullFromGist();
  if (ok) {
    setDialogStatus("✓ Conectado. Coleção atualizada com a versão da nuvem.", "ok");
    renderTab();
  } else {
    setDialogStatus("Falha ao conectar. Verifique Gist ID, Token e o nome do arquivo (lorcana-collection.json).", "err");
  }
});

document.getElementById("syncDisconnectBtn").addEventListener("click", () => {
  syncCfg = {};
  localStorage.removeItem(SYNC_KEY);
  setDialogStatus("Desconectado deste dispositivo. A coleção local foi mantida.", "ok");
  setSyncStatus("");
});

// Initial pull on page load if configured
if (syncCfg.gistId && syncCfg.token) {
  setSyncStatus("Sincronizando...", "pending");
  pullFromGist().then((ok) => { if (ok) renderTab(); });
}
