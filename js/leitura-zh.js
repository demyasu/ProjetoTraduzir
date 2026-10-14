/* Leitura guiada Chines -> Portugues (le ZH + PT e marca os lidos) */
(function () {
    'use strict';

    const el = {
        dHanzi: document.getElementById('dHanzi'),
        dPinyin: document.getElementById('dPinyin'),
        dPt: document.getElementById('dPt'),
        dHint: document.getElementById('dHint'),
        readIndex: document.getElementById('readIndex'),
        readTotal: document.getElementById('readTotal'),
        readProgress: document.getElementById('readProgress'),
        readPct: document.getElementById('readPct'),
        resetBtn: document.getElementById('resetBtn'),
        rPlay: document.getElementById('rPlay'),
        rPrev: document.getElementById('rPrev'),
        rNext: document.getElementById('rNext'),
        tglZh: document.getElementById('tglZh'),
        tglPt: document.getElementById('tglPt'),
        tglDirect: document.getElementById('tglDirect'),
        rate: document.getElementById('speechRate'),
        volume: document.getElementById('speechVolume'),
        gap: document.getElementById('gapSecs'),
        list: document.getElementById('checkList')
    };

    let items = [];   // {hanzi, pinyin, pt}
    let pos = 0;
    let playing = false;
    let seq = 0;      // invalida cadeias antigas ao pular
    let zhAudio = null;
    let readSet = new Set();
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

    try {
        readSet = new Set(JSON.parse(localStorage.getItem('leitura-zh-read') || '[]'));
        pos = parseInt(localStorage.getItem('leitura-zh-pos') || '0', 10) || 0;
    } catch (e) { /* ignore */ }

    function save() {
        try {
            localStorage.setItem('leitura-zh-read', JSON.stringify([...readSet]));
            localStorage.setItem('leitura-zh-pos', String(pos));
        } catch (e) { /* ignore */ }
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function parseTxt(text) {
        const out = [];
        const lines = text.split(/\r?\n/);
        for (const ln of lines) {
            const m = ln.match(/^(.*?)\s*\/\s*(.*?)\s*->\s*(.*)$/);
            if (!m) continue;
            const hanzi = m[1].trim(), pinyin = m[2].trim(), pt = m[3].trim();
            if (!hanzi) continue;
            out.push({ hanzi, pinyin, pt });
        }
        return out;
    }

    // ---------- Lista / progresso ----------
    function buildList() {
        let html = '';
        for (let i = 0; i < items.length; i++) {
            html += '<div class="lrow' + (readSet.has(i) ? ' read' : '') + '" data-i="' + i + '">'
                + '<span class="tick">✓</span><span>' + esc(items[i].hanzi) + '</span></div>';
        }
        el.list.innerHTML = html;
    }

    function updateProgress() {
        el.readIndex.textContent = readSet.size;
        el.readTotal.textContent = items.length;
        const pct = items.length ? (readSet.size / items.length) * 100 : 0;
        el.readProgress.style.width = pct.toFixed(2) + '%';
        el.readPct.textContent = pct.toFixed(1) + '%';
    }

    function markRead(i) {
        if (readSet.has(i)) return;
        readSet.add(i);
        const row = el.list.querySelector('[data-i="' + i + '"]');
        if (row) row.classList.add('read');
        updateProgress();
        save();
    }

    function highlight() {
        el.list.querySelectorAll('.lrow.current').forEach(e => e.classList.remove('current'));
        const row = el.list.querySelector('[data-i="' + pos + '"]');
        if (row) {
            row.classList.add('current');
            row.scrollIntoView({ block: 'nearest' });
        }
    }

    function show(i) {
        if (!items.length) return;
        pos = Math.max(0, Math.min(items.length - 1, i));
        const it = items[pos];
        el.dHanzi.textContent = it.hanzi;
        el.dPinyin.textContent = it.pinyin;
        el.dPt.textContent = it.pt || '(sem tradução)';
        el.dHint.textContent = 'Item ' + (pos + 1) + ' de ' + items.length;
        highlight();
        markRead(pos);
        save();
        el.rPrev.disabled = pos <= 0;
        el.rNext.disabled = pos >= items.length - 1;
    }

    // ---------- Audio ----------
    function stopAudio() {
        if (zhAudio) { try { zhAudio.pause(); } catch (e) { /* ignore */ } }
        if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
    }

    function speakPt(text, onDone) {
        if (!el.tglPt.checked || !text || !synth) { onDone(); return; }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR';
        u.rate = parseFloat(el.rate.value);
        u.volume = parseFloat(el.volume.value);
        try {
            const vs = synth.getVoices() || [];
            const ptv = vs.filter(v => ((v.lang || '').toLowerCase().indexOf('pt') === 0));
            u.voice = ptv.find(v => /maria/i.test(v.name)) || ptv[0] || null;
        } catch (e) { /* ignore */ }
        let done = false;
        const fin = () => { if (!done) { done = true; onDone(); } };
        u.onend = fin;
        u.onerror = fin;
        synth.speak(u);
        setTimeout(fin, 30000);
    }

    function playZh(it, onDone) {
        if (!el.tglZh.checked || !it.hanzi) { speakPt(it.pt, onDone); return; }
        stopAudio();
        zhAudio = new Audio('audio/zh/' + encodeURIComponent('cmn-' + it.hanzi + '.mp3'));
        zhAudio.playbackRate = parseFloat(el.rate.value);
        zhAudio.volume = parseFloat(el.volume.value);
        let done = false;
        const fin = () => { if (!done) { done = true; onDone(); } };
        zhAudio.onended = () => setTimeout(() => speakPt(it.pt, fin), 200);
        zhAudio.onerror = () => speakPt(it.pt, fin);
        zhAudio.play().then(() => {}).catch(() => speakPt(it.pt, fin));
        setTimeout(() => { stopAudio(); fin(); }, 30000);
    }

    function playOnce(cb) {
        if (!items.length) { cb(); return; }
        show(pos);
        playZh(items[pos], cb);
    }

    // ---------- Auto ----------
    function gapMs() {
        const g = parseFloat(el.gap.value);
        return (isNaN(g) ? 1 : Math.max(0, g)) * 1000;
    }

    function setPlaying(v) {
        playing = v;
        el.rPlay.innerHTML = v
            ? '<i class="bi bi-pause-fill"></i> Pausar'
            : '<i class="bi bi-play-fill"></i> Iniciar leitura';
    }

    function auto(mySeq) {
        if (!playing || mySeq !== seq) return;
        if (pos >= items.length) { setPlaying(false); return; }
        playOnce(() => {
            if (!playing || mySeq !== seq) return;
            setTimeout(() => {
                if (!playing || mySeq !== seq) return;
                pos++;
                auto(mySeq);
            }, gapMs());
        });
    }

    function startAuto() {
        if (!items.length) return;
        seq++;
        setPlaying(true);
        auto(seq);
    }

    function stopAuto() {
        setPlaying(false);
        seq++;
        stopAudio();
    }

    function jump(i) {
        if (!items.length) return;
        const keepGoing = playing && el.tglDirect.checked;
        seq++;
        stopAudio();
        show(i);
        if (keepGoing) {
            auto(seq);
        } else {
            setPlaying(false);
            playOnce(() => {});
        }
    }

    // ---------- Eventos ----------
    el.rPlay.addEventListener('click', () => { playing ? stopAuto() : startAuto(); });
    el.rPrev.addEventListener('click', () => jump(pos - 1));
    el.rNext.addEventListener('click', () => jump(pos + 1));
    el.resetBtn.addEventListener('click', () => {
        stopAuto();
        readSet.clear();
        pos = 0;
        save();
        el.list.querySelectorAll('.lrow.read').forEach(x => x.classList.remove('read'));
        updateProgress();
        show(0);
    });
    el.list.addEventListener('click', (e) => {
        const row = e.target.closest ? e.target.closest('.lrow') : null;
        if (!row) return;
        jump(parseInt(row.getAttribute('data-i'), 10));
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'number') return;
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
        if (e.code === 'Space') { e.preventDefault(); playing ? stopAuto() : startAuto(); }
        else if (e.key === 'ArrowRight') jump(pos + 1);
        else if (e.key === 'ArrowLeft') jump(pos - 1);
    });

    // ---------- Carregamento ----------
    async function load() {
        let text = '';
        try {
            const resp = await fetch('hanzi_portugues.txt');
            text = await resp.text();
            items = parseTxt(text);
        } catch (err) {
            el.dHanzi.textContent = 'Erro ao carregar.';
            el.dHint.textContent = String(err);
            return;
        }
        if (!items.length) {
            el.dHanzi.textContent = 'Arquivo vazio.';
            el.dHint.textContent = 'Verifique projetoChines/hanzi_portugues.txt';
            return;
        }
        if (pos >= items.length) pos = 0;
        buildList();
        updateProgress();
        show(pos);
    }

    load();
})();
