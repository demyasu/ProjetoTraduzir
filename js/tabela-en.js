/* Tabela Ingles -> Portugues (estatica: data/phrases.json + audio) */
(function () {
    'use strict';

    const el = {
        rows: document.getElementById('enRows'),
        search: document.getElementById('searchBox'),
        count: document.getElementById('rowCount'),
        prev: document.getElementById('prevPage'),
        next: document.getElementById('nextPage'),
        cur: document.getElementById('curPage'),
        tot: document.getElementById('totPages')
    };

    const PAGE_SIZE = 200;
    let allCards = [];
    let filtered = [];
    let page = 1;
    let audioEl = null;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function playAudio(kind, id) {
        if (id == null) return;
        if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignore */ } }
        audioEl = new Audio('audio/' + kind + '/' + id + '.mp3');
        audioEl.play().catch(() => {});
    }

    function applyFilter() {
        const q = el.search.value.trim().toLowerCase();
        filtered = allCards.filter(c => {
            if (!q) return true;
            const hay = ((c.en || '') + ' ' + (c.pt || '')).toLowerCase();
            return hay.includes(q);
        });
        page = 1;
        render();
    }

    function render() {
        const total = filtered.length;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (page > pages) page = pages;
        const start = (page - 1) * PAGE_SIZE;
        const slice = filtered.slice(start, start + PAGE_SIZE);

        el.count.textContent = total + ' itens';
        el.cur.textContent = page;
        el.tot.textContent = pages;
        el.prev.disabled = page <= 1;
        el.next.disabled = page >= pages;

        if (!slice.length) {
            el.rows.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Nenhum item.</td></tr>';
            return;
        }

        let html = '';
        for (let i = 0; i < slice.length; i++) {
            const c = slice[i];
            const n = start + i + 1;
            html += '<tr>'
                + '<td class="text-muted">' + n + '</td>'
                + '<td class="en-cell">' + esc(c.en) + '</td>'
                + '<td class="pt-cell">' + esc(c.pt) + '</td>'
                + '<td><button class="btn btn-outline-primary btn-sm" data-kind="en" data-id="' + c.id + '" title="Ouvir inglês"><i class="bi bi-volume-up-fill"></i></button></td>'
                + '<td><button class="btn btn-outline-success btn-sm" data-kind="pt" data-id="' + c.id + '" title="Ouvir português"><i class="bi bi-volume-up-fill"></i></button></td>'
                + '</tr>';
        }
        el.rows.innerHTML = html;

        el.rows.querySelectorAll('button[data-kind]').forEach(btn => {
            btn.addEventListener('click', () => playAudio(btn.getAttribute('data-kind'), btn.getAttribute('data-id')));
        });
    }

    el.prev.addEventListener('click', () => { if (page > 1) { page--; render(); } });
    el.next.addEventListener('click', () => { page++; render(); });
    el.search.addEventListener('input', () => applyFilter());

    async function load() {
        try {
            const resp = await fetch('data/phrases.json');
            allCards = await resp.json();
        } catch (err) {
            el.rows.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Erro ao carregar: ' + esc(err) + '</td></tr>';
            return;
        }
        applyFilter();
    }

    load();
})();
