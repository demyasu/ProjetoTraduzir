/* Treinador de Hanzi (chines) com audio nativo mandarim */
(function () {
    'use strict';

    const el = {
        card: document.getElementById('flashcard'),
        cardText: document.getElementById('cardText'),
        cardPinyin: document.getElementById('cardPinyin'),
        cardBack: document.getElementById('cardBack'),
        cardTranslation: document.getElementById('cardTranslation'),
        cardTrad: document.getElementById('cardTrad'),
        cardHint: document.getElementById('cardHint'),
        cardIndex: document.getElementById('cardIndex'),
        cardTotal: document.getElementById('cardTotal'),
        progress: document.getElementById('trainProgress'),
        deckInfo: document.getElementById('deckInfo'),
        hskFilter: document.getElementById('hskFilter'),
        playZh: document.getElementById('playZhBtn'),
        flip: document.getElementById('flipBtn'),
        prev: document.getElementById('prevBtn'),
        next: document.getElementById('nextBtn'),
        shuffle: document.getElementById('shuffleBtn'),
        autoPlay: document.getElementById('autoPlay'),
        rate: document.getElementById('speechRate'),
        volume: document.getElementById('speechVolume')
    };

    let allCards = [];     // todos os hanzi
    let deck = [];         // filtrado por HSK
    let order = [];
    let pos = 0;
    let flipped = false;
    let audioEl = null;

    // ---------- Audio ----------
    function stopAudio() {
        if (audioEl) {
            try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) { /* ignore */ }
        }
    }

    function playAudio() {
        const card = current();
        if (!card || !card.audio) return;
        stopAudio();
        const url = 'audio/zh/' + encodeURIComponent(card.audio);
        audioEl = new Audio(url);
        audioEl.volume = parseFloat(el.volume.value);
        audioEl.playbackRate = parseFloat(el.rate.value);
        audioEl.play().catch(() => { /* sem audio: silencioso */ });
    }

    // ---------- Filtro ----------
    function applyFilter() {
        const level = el.hskFilter.value;
        deck = (level === 'all')
            ? allCards.slice()
            : allCards.filter(c => (c.hsk || '') === level);
        order = deck.map((_, i) => i);
        pos = 0;
        el.deckInfo.textContent = deck.length + ' cards (' + el.hskFilter.selectedOptions[0].text + ')';
        render();
    }

    // ---------- Render ----------
    function current() {
        return deck[order[pos]] || { hanzi: '', pinyin: '', meaning: '', trad: '', audio: '' };
    }

    function render() {
        const card = current();
        flipped = false;
        el.cardText.textContent = card.hanzi || '(sem hanzi)';
        el.cardPinyin.textContent = card.pinyin || '';
        el.cardTranslation.textContent = card.meaning || '(sem significado)';
        el.cardTrad.textContent = card.trad ? ('Tradicional: ' + card.trad + (card.hsk ? ' · ' + card.hsk : '')) : (card.hsk || '');
        el.cardBack.style.display = 'none';
        el.flip.innerHTML = '<i class="bi bi-arrow-repeat"></i> Mostrar significado';
        el.cardHint.style.display = '';
        el.cardHint.textContent = 'Clique no card para ver o significado';

        el.cardIndex.textContent = deck.length ? (pos + 1) : 0;
        el.cardTotal.textContent = deck.length;
        const pct = deck.length ? ((pos + 1) / deck.length) * 100 : 0;
        el.progress.style.width = pct.toFixed(2) + '%';

        el.prev.disabled = pos <= 0;
        el.next.disabled = pos >= deck.length - 1;
        el.playZh.disabled = !card.audio;

        if (el.autoPlay.checked) playAudio();
    }

    function flip() {
        if (flipped) {
            el.cardBack.style.display = 'none';
            el.flip.innerHTML = '<i class="bi bi-arrow-repeat"></i> Mostrar significado';
            el.cardHint.style.display = '';
            flipped = false;
            if (el.autoPlay.checked) playAudio();
        } else {
            el.cardBack.style.display = 'block';
            el.flip.innerHTML = '<i class="bi bi-arrow-repeat"></i> Ocultar significado';
            el.cardHint.style.display = 'none';
            flipped = true;
        }
    }

    function go(delta) {
        const next = pos + delta;
        if (next < 0 || next >= deck.length) return;
        pos = next;
        render();
    }

    function shuffle() {
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        pos = 0;
        render();
    }

    // ---------- Eventos ----------
    el.card.addEventListener('click', flip);
    el.flip.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
    el.playZh.addEventListener('click', (e) => { e.stopPropagation(); playAudio(); });
    el.prev.addEventListener('click', () => go(-1));
    el.next.addEventListener('click', () => go(1));
    el.shuffle.addEventListener('click', shuffle);
    el.hskFilter.addEventListener('change', applyFilter);
    el.playZh.disabled = true;

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
        if (e.target.tagName === 'SELECT') return;
        if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); flip(); }
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === '1') playAudio();
    });

    // ---------- Carregamento ----------
    async function load() {
        try {
            const resp = await fetch('data/cards.json');
            allCards = await resp.json();
        } catch (err) {
            el.cardText.textContent = 'Erro ao carregar os hanzi.';
            el.cardHint.textContent = String(err);
            return;
        }

        if (!allCards.length) {
            el.cardText.textContent = 'Nenhum hanzi carregado.';
            el.cardHint.textContent = 'Rode tools/consumir_hanzi.py e reinicie o app.';
            el.deckInfo.textContent = '0 cards';
            return;
        }

        applyFilter();
    }

    load();
})();
