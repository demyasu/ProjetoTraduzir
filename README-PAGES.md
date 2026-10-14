# Publicar no GitHub Pages

O app completo (Java + H2 + tradução) NÃO roda no Pages. Este `docs/` é a
versão estática: treinadores, tabela ZH, leituras, áudios e downloads.

## Passos

```bash
cd D:\ProjetoTraduzir
git init
git add .
git commit -m "site estatico + app tradutor"
# crie o repo vazio no github.com e rode (troque SEU-USUARIO):
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/tradutor.git
git push -u origin main
```

No GitHub: **Settings → Pages → Deploy from a branch → main → /docs → Save**.
Aguarde 1-3 min e abra `https://SEU-USUARIO.github.io/tradutor/`.

## Notas

- Primeiro `push` demora (áudios MP3, ~14 mil arquivos). É normal.
- Teste local antes: `cd docs && python -m http.server 8000` → http://127.0.0.1:8000
- Para atualizar o site depois de mudar o app: `python tools/gerar_site.py`,
  `git add docs && git commit -m ... && git push`.
- Limite do GitHub: 100 MB por arquivo (nenhum passa disso), repo ideal < 1 GB.
