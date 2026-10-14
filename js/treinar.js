/* Treinador de flashcards com audio (MP3 nativo gerado + fallback Web Speech API) */
(function () {
    'use strict';

    const el = {
        card: document.getElementById('flashcard'),
        cardText: document.getElementById('cardText'),
        cardBack: document.getElementById('cardBack'),
        cardTranslation: document.getElementById('cardTranslation'),
        cardHint: document.getElementById('cardHint'),
        cardIndex: document.getElementById('cardIndex'),
        cardTotal: document.getElementById('cardTotal'),
        progress: document.getElementById('trainProgress'),
        deckInfo: document.getElementById('deckInfo'),
        playEn: document.getElementById('playEnBtn'),
        playPt: document.getElementById('playPtBtn'),
        flip: document.getElementById('flipBtn'),
        prev: document.getElementById('prevBtn'),
        next: document.getElementById('nextBtn'),
        shuffle: document.getElementById('shuffleBtn'),
        autoPlay: document.getElementById('autoPlay'),
        autoPlayPt: document.getElementById('autoPlayPt'),
        rate: document.getElementById('speechRate'),
        volume: document.getElementById('speechVolume')
    };

    let deck = [];          // frases (id, en, pt)
    let order = [];         // indices na ordem de exibicao
    let pos = 0;
    let flipped = false;
    let audioEl = null;
    let utterance = null;

    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

    // ---------- Audio ----------
    function stopAudio() {
        if (audioEl) {
            try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) { /* ignore */ }
        }
        if (synth) synth.cancel();
    }

    function fallbackSpeak(text, lang) {
        if (!synth || !text) return;
        synth.cancel();
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'en' ? 'en-US' : 'pt-BR';
        utterance.volume = parseFloat(el.volume.value);
        utterance.rate = parseFloat(el.rate.value);
        const prefix = lang === 'en' ? 'en' : 'pt';
        const voices = synth.getVoices() || [];
        const match = voices.find(v => (v.lang || '').toLowerCase().startsWith(prefix));
        // Sem voz para o idioma: melhor nao falar do que falar com sotaque errado.
        if (!match) return;
        utterance.voice = match;
        synth.speak(utterance);
    }

    function playAudio(lang) {
        const card = current();
        if (!card || !card.id) return;
        const text = lang === 'en' ? card.en : card.pt;
        if (!text) return;

        stopAudio();
        const url = 'audio/' + lang + '/' + card.id + '.mp3';
        audioEl = new Audio(url);
        audioEl.volume = parseFloat(el.volume.value);
        audioEl.playbackRate = parseFloat(el.rate.value);
        audioEl.play().catch(() => {
            // MP3 ausente (ainda gerando?) -> usa a voz do navegador
            fallbackSpeak(text, lang);
        });
    }

    // ---------- Render ----------
    function current() {
        return deck[order[pos]] || { en: '', pt: '', id: null };
    }

    function render() {
        const card = current();
        flipped = false;
        el.cardText.textContent = card.en || '(sem texto)';
        el.cardTranslation.textContent = card.pt || '(sem tradução)';
        el.cardBack.style.display = 'none';
        el.flip.innerHTML = '<i class="bi bi-arrow-repeat"></i> Mostrar tradução';
        el.cardHint.style.display = '';
        el.cardHint.textContent = 'Clique no card para ver a tradução';

        el.cardIndex.textContent = deck.length ? (pos + 1) : 0;
        el.cardTotal.textContent = deck.length;
        const pct = deck.length ? ((pos + 1) / deck.length) * 100 : 0;
        el.progress.style.width = pct.toFixed(1) + '%';

        el.prev.disabled = pos <= 0;
        el.next.disabled = pos >= deck.length - 1;
        el.playPt.disabled = !card.pt;

        if (el.autoPlay.checked) playAudio('en');
    }

    function flip() {
        const card = current();
        if (flipped) {
            el.cardBack.style.display = 'none';
            el.flip.innerHTML = '<i class="bi bi-arrow-repeat"></i> Mostrar tradução';
            el.cardHint.style.display = '';
            flipped = false;
            if (el.autoPlay.checked) playAudio('en');
        } else {
            el.cardBack.style.display = 'block';
            el.flip.innerHTML = '<i class="bi bi-arrow-repeat"></i> Ocultar tradução';
            el.cardHint.style.display = 'none';
            flipped = true;
            if (el.autoPlayPt.checked) playAudio('pt');
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
    el.playEn.addEventListener('click', (e) => { e.stopPropagation(); playAudio('en'); });
    el.playPt.addEventListener('click', (e) => { e.stopPropagation(); playAudio('pt'); });
    el.prev.addEventListener('click', () => go(-1));
    el.next.addEventListener('click', () => go(1));
    el.shuffle.addEventListener('click', shuffle);
    el.playPt.disabled = true;

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
        if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); flip(); }
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === '1') playAudio('en');
        else if (e.key === '2') playAudio('pt');
    });

    // ---------- Carregamento ----------
    async function load() {
        try {
            const resp = await fetch('data/phrases.json');
            deck = await resp.json();
        } catch (err) {
            el.cardText.textContent = 'Erro ao carregar as frases.';
            el.cardHint.textContent = String(err);
            return;
        }

        if (!deck.length) {
            el.cardText.textContent = 'Ainda não há frases traduzidas.';
            el.cardHint.textContent = 'Rode a tradução em lotes e volte aqui.';
            el.deckInfo.textContent = '0 cards';
            return;
        }

        order = deck.map((_, i) => i);
        pos = 0;
        el.deckInfo.textContent = deck.length + ' cards (EN → PT, com áudio)';
        render();
    }

    load();
})();
