# TESTING GUIDE – Galerie & Cover fotky

## Přehled změn
- ✅ Lightbox pro zobrazení fotek na celou obrazovku
- ✅ Nastavení titulní fotky (cover) – pouze pro autora místa
- ✅ Zobrazení cover fotky na kartě místa (/places)
- ✅ Hero cover banner na detailu místa (/p/[id])
- ✅ Automatické nastavení první fotky jako cover

---

## Test Checklist

### A) LIGHTBOX (detail místa /p/[id])

**1. Otevření lightboxu**
- [ ] Klikni na jakoukoli fotku v galerii → měl by se otevřít lightbox přes celou obrazovku
- [ ] Lightbox zobrazuje velkou fotku uprostřed
- [ ] Jsou vidět navigační šipky ◀ ▶ (pokud je více fotek)

**2. Navigace v lightboxu**
- [ ] Klikni na ▶ (nebo stiskni →) → měla by se zobrazit další fotka
- [ ] Klikni na ◀ (nebo stiskni ←) → měla by se zobrazit předchozí fotka
- [ ] Klikni na miniaturu dole → měla by se zobrazit vybraná fotka
- [ ] Na poslední fotce: klikni ▶ → mělo by přejít na první fotku (loop)

**3. Zavření lightboxu**
- [ ] Stiskni ESC → lightbox by se měl zavřít
- [ ] Klikni mimo fotku (na černé pozadí) → lightbox by se měl zavřít
- [ ] Klikni na ✕ vpravo nahoře → lightbox by se měl zavřít

**4. Mazání fotky v lightboxu**
- [ ] Otevři lightbox na svou fotku → najeď myší na fotku v gridu → klikni na ✕ (červený křížek)
- [ ] Lightbox by se měl přepnout na nejbližší fotku (nebo zavřít, pokud byla poslední)
- [ ] Klik na ✕ NESMÍ otevřít lightbox (propagace je zastavena)

---

### B) TITULNÍ FOTKA (cover)

**1. Nastavení cover fotky (jako autor místa)**
- [ ] Přihlaš se jako autor místa
- [ ] Nahraj alespoň 2 fotky
- [ ] Najeď myší na fotku, která NENÍ titulka
- [ ] Mělo by se zobrazit tlačítko "Nastavit jako titulku" (bílé, dole)
- [ ] Klikni na tlačítko → fotka by se měla nastavit jako cover
- [ ] U této fotky se nyní zobrazuje štítek "Titulka" (nahoře vlevo, accent color)

**2. Cover štítek**
- [ ] U fotky, která je titulka, je vidět badge "Titulka" (accent color, nahoře vlevo)
- [ ] U ostatních fotek tento štítek není

**3. Pouze autor místa vidí "Nastavit jako titulku"**
- [ ] Přihlaš se jako JINÝ uživatel (ne autor místa)
- [ ] Najeď myší na fotky → tlačítko "Nastavit jako titulku" by se NEMĚLO zobrazovat
- [ ] Pouze autor vidí tuto možnost

**4. Automatické nastavení první fotky jako cover**
- [ ] Vytvoř nové místo (nebo použij místo bez fotek a bez cover)
- [ ] Nahraj PRVNÍ fotku → měla by se automaticky nastavit jako cover
- [ ] Jdi na /places → na kartě by se měla zobrazit tato fotka
- [ ] Jdi na detail místa /p/[id] → nahoře by měl být hero banner s touto fotkou

---

### C) ZOBRAZENÍ COVER NA KARTĚ (/places)

**1. Karta s cover fotkou**
- [ ] Jdi na /places
- [ ] Místa s cover fotkou by měla mít nahoře obrázek (aspect-video, zaoblené rohy)
- [ ] Obrázek by měl být nad názvem místa

**2. Karta bez cover fotky**
- [ ] Místa bez cover fotky by NEMĚLA mít obrázek nahoře
- [ ] Pouze text (bez placeholder obrázku)

---

### D) HERO COVER na detailu místa (/p/[id])

**1. Hero banner s cover**
- [ ] Jdi na detail místa, které má cover fotku
- [ ] Nahoře (nad názvem) by měl být velký banner obrázek
- [ ] Banner má aspect-video na mobilu, aspect-[21/9] na desktopu
- [ ] Na mobilu jde obrázek přes celou šířku (bez okrajů)
- [ ] Na desktopu je zaoblený (rounded-2xl)

**2. Detail bez cover**
- [ ] Jdi na detail místa, které NEMÁ cover fotku
- [ ] Hero banner by se NEMĚL zobrazovat
- [ ] Pouze nadpis a zbytek obsahu

---

### E) DATA KONZISTENCE

**1. Insert do place_media**
- [ ] Nahraj fotku → zkontroluj v Supabase DB tabulku place_media
- [ ] Nový řádek by měl mít vyplněné sloupce:
  - `path` = storage_path
  - `storage_path` = storage_path
  - (oba stejné pro konzistenci)

**2. Update do places**
- [ ] Nastav fotku jako cover → zkontroluj v Supabase DB tabulku places
- [ ] Řádek místa by měl mít vyplněné:
  - `cover_storage_path` = storage_path fotky
  - `cover_public_url` = public URL fotky

---

## Rychlé kroky pro kompletní test

1. **Vytvoř nové místo** jako přihlášený uživatel
2. **Nahraj první fotku** → ověř, že se automaticky nastaví jako cover
3. **Zkontroluj /places** → karta by měla mít cover nahoře
4. **Jdi na detail** → hero banner s cover by měl být nahoře
5. **Nahraj druhou fotku**
6. **Nastav druhou fotku jako cover** → ověř štítek "Titulka"
7. **Zkontroluj /places** → karta by měla zobrazovat novou cover
8. **Otevři lightbox** → klikni na fotku
9. **Naviguj v lightboxu** → šipky, ESC, klik mimo
10. **Smaž fotku v gridu** → ověř, že lightbox se přepne/zavře
11. **Odhlásit se a přihlásit jako jiný uživatel** → ověř, že nevidíš "Nastavit jako titulku"

---

## Známé edge cases

- **Smazání cover fotky**: Pokud smažeš fotku, která je cover, místo bude mít stále cover_storage_path, ale fotka nebude existovat → frontend by měl zobrazit broken image (není automatické přenastavení cover). To je OK pro MVP.
- **RLS permissions**: Ujisti se, že RLS na places povoluje UPDATE pro autory míst (pro nastavení cover).

---

**Po dokončení testů můžeš tuto checklist smazat nebo ji ponechat pro budoucí QA.**
