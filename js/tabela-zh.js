/* Tabela Chines -> Portugues (hanzi, com audio nativo) */
(function () {
    'use strict';

    const el = {
        rows: document.getElementById('zhRows'),
        hsk: document.getElementById('hskFilter'),
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

    function playAudio(file) {
        if (!file) return;
        if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignore */ } }
        audioEl = new Audio('audio/zh/' + encodeURIComponent(file));
        audioEl.play().catch(() => {});
    }

    function applyFilter() {
        const level = el.hsk.value;
        const q = el.search.value.trim().toLowerCase();
        filtered = allCards.filter(c => {
            if (level !== 'all' && (c.hsk || '') !== level) return false;
            if (q) {
                const hay = ((c.hanzi || '') + ' ' + (c.pinyin || '') + ' ' +
                             (c.pt || '') + ' ' + (c.meaning || '')).toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
        page = 1;
        document.getElementById('expZhXlsx').href = 'downloads/hanzi_portugues.xlsx';
        document.getElementById('expZhTxt').href = 'downloads/hanzi_portugues.txt';
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
            el.rows.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Nenhum item. Ajuste o filtro ou aguarde a tradução.</td></tr>';
            return;
        }

        let html = '';
        for (let i = 0; i < slice.length; i++) {
            const c = slice[i];
            const n = start + i + 1;
            html += '<tr>'
                + '<td class="text-muted">' + n + '</td>'
                + '<td class="hanzi-cell">' + esc(c.hanzi) + '</td>'
                + '<td>' + esc(c.pinyin) + '</td>'
                + '<td class="pt-cell">' + esc(c.pt || '—') + '</td>'
                + '<td class="en-cell">' + esc(c.meaning) + '</td>'
                + '<td><span class="badge bg-light text-dark border">' + esc(c.hsk || '—') + '</span></td>'
                + '<td>' + (c.audio
                    ? '<button class="btn btn-outline-danger btn-sm" data-audio="' + esc(c.audio) + '" title="Ouvir"><i class="bi bi-volume-up-fill"></i></button>'
                    : '<span class="text-muted">—</span>') + '</td>'
                + '</tr>';
        }
        el.rows.innerHTML = html;

        el.rows.querySelectorAll('button[data-audio]').forEach(btn => {
            btn.addEventListener('click', () => playAudio(btn.getAttribute('data-audio')));
        });
    }

    el.prev.addEventListener('click', () => { if (page > 1) { page--; render(); } });
    el.next.addEventListener('click', () => { page++; render(); });
    el.hsk.addEventListener('change', applyFilter);
    el.search.addEventListener('input', () => applyFilter());

    async function load() {
        try {
            const resp = await fetch('data/cards.json');
            allCards = await resp.json();
        } catch (err) {
            el.rows.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Erro ao carregar: ' + esc(err) + '</td></tr>';
            return;
        }
        applyFilter();
    }

    load();
})();
