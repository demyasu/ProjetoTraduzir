/* Leitura guiada Ingles -> Portugues (le EN + PT e marca os lidos) */
(function () {
    'use strict';

    const el = {
        dEn: document.getElementById('dEn'),
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
        tglEn: document.getElementById('tglEn'),
        tglPt: document.getElementById('tglPt'),
        tglDirect: document.getElementById('tglDirect'),
        rate: document.getElementById('speechRate'),
        volume: document.getElementById('speechVolume'),
        gap: document.getElementById('gapSecs'),
        list: document.getElementById('checkList')
    };

    let items = [];   // {en, pt, line}
    let pos = 0;
    let playing = false;
    let seq = 0;
    let enAudio = null;
    let readSet = new Set();
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

    try {
        readSet = new Set(JSON.parse(localStorage.getItem('leitura-en-read') || '[]'));
        pos = parseInt(localStorage.getItem('leitura-en-pos') || '0', 10) || 0;
    } catch (e) { /* ignore */ }

    function save() {
        try {
            localStorage.setItem('leitura-en-read', JSON.stringify([...readSet]));
            localStorage.setItem('leitura-en-pos', String(pos));
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
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(/^(.*?)\s*->\s*(.*)$/);
            if (!m) continue;
            const en = m[1].trim(), pt = m[2].trim();
            if (!en) continue;
            out.push({ en, pt, line: i + 1 });
        }
        return out;
    }

    // ---------- Lista / progresso ----------
    function buildList() {
        let html = '';
        for (let i = 0; i < items.length; i++) {
            const short = items[i].en.length > 30 ? items[i].en.slice(0, 30) + '…' : items[i].en;
            html += '<div class="lrow' + (readSet.has(i) ? ' read' : '') + '" data-i="' + i + '">'
                + '<span class="tick">✓</span><span class="txt" title="' + esc(items[i].en) + '">' + esc(short) + '</span></div>';
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
        el.dEn.textContent = it.en;
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
        if (enAudio) { try { enAudio.pause(); } catch (e) { /* ignore */ } }
        if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
    }

    function pickVoice(prefix, prefer) {
        try {
            const vs = (synth.getVoices() || []).filter(v => ((v.lang || '').toLowerCase().indexOf(prefix) === 0));
            return vs.find(v => prefer.test(v.name)) || vs[0] || null;
        } catch (e) { return null; }
    }

    function speak(text, lang, voice, onDone) {
        if (!text || !synth) { onDone(); return; }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = parseFloat(el.rate.value);
        u.volume = parseFloat(el.volume.value);
        u.voice = voice;
        let done = false;
        const fin = () => { if (!done) { done = true; onDone(); } };
        u.onend = fin;
        u.onerror = fin;
        synth.speak(u);
        setTimeout(fin, 30000);
    }

    function speakPt(text, onDone) {
        if (!el.tglPt.checked) { onDone(); return; }
        speak(text, 'pt-BR', pickVoice('pt', /maria/i), onDone);
    }

    function speakEnFallback(text, onDone) {
        const v = pickVoice('en', /zira|david|aria|guy|jenny/i);
        if (!v) { onDone(); return; }  // sem voz EN: silencioso, segue adiante
        speak(text, 'en-US', v, onDone);
    }

    function playEn(it, onDone) {
        if (!el.tglEn.checked || !it.en) { speakPt(it.pt, onDone); return; }
        stopAudio();
        enAudio = new Audio('audio/leit_en/' + it.line + '.mp3');
        enAudio.playbackRate = parseFloat(el.rate.value);
        enAudio.volume = parseFloat(el.volume.value);
        let done = false;
        const fin = () => { if (!done) { done = true; onDone(); } };
        const toPt = () => setTimeout(() => speakPt(it.pt, fin), 300);
        enAudio.onended = toPt;
        enAudio.onerror = () => speakEnFallback(it.en, () => speakPt(it.pt, fin));
        enAudio.play().then(() => {}).catch(() => speakEnFallback(it.en, () => speakPt(it.pt, fin)));
        setTimeout(() => { stopAudio(); fin(); }, 30000);
    }

    function playOnce(cb) {
        if (!items.length) { cb(); return; }
        show(pos);
        playEn(items[pos], cb);
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
            const resp = await fetch('frases.txt');
            text = await resp.text();
            items = parseTxt(text);
        } catch (err) {
            el.dEn.textContent = 'Erro ao carregar.';
            el.dHint.textContent = String(err);
            return;
        }
        if (!items.length) {
            el.dEn.textContent = 'Arquivo vazio.';
            el.dHint.textContent = 'Verifique projetoIngles/frases.txt';
            return;
        }
        if (pos >= items.length) pos = 0;
        buildList();
        updateProgress();
        show(pos);
    }

    load();
})();
