# DB Naming ústava (závazná)

Tento dokument existuje z jediného důvodu: **zabránit runtime chybám, pádům deploymentů a chaosu v pojmenování**. Databázové názvy sloupců jsou **jediný zdroj pravdy**. Kód se musí přizpůsobit databázi, ne naopak. Jakákoliv odchylka od těchto pravidel musí být vědomá, zdokumentovaná a odůvodněná.

---

## Základní principy

- **Databáze je pravda, kód je interpretace.** Názvy sloupců v DB jsou definitivní. Kód se jim přizpůsobuje.
- **Názvy sloupců se NEHÁDAJÍ, ale OVĚŘUJÍ.** Pokud si nejsi jistý, otevři Supabase a zkontroluj.
- **Pokud název není v DB, v kódu NESMÍ existovat.** Žádné spekulace, žádné odhady.
- **Jeden význam = jeden název.** Žádné varianty, žádné "asi tak podobně".
- **Konzistence před pohodlím.** Vždy.

---

## Závazná pravidla pojmenování

### 1) Primární klíče

- **VŽDY** pouze `id` (uuid)
- **ZAKÁZÁNO:** `place_uuid`, `media_id_custom`, `primary_key`, nebo jakýkoliv jiný název
- Žádné výjimky, žádné diskuze

### 2) Cizí klíče

- **Formát:** `<entity>_id`
- **Příklady:** `place_id`, `user_id`, `activity_id`, `riddle_id`
- Název entity v jednotném čísle, malými písmeny, podtržítkem před `_id`

### 3) Autor / tvůrce (KRITICKÉ PRAVIDLO)

Toto je oblast, kde vzniká většina chyb. Pravidla jsou přesná a MUSÍ být dodržena:

**`author_id`**
- Použití: Autor **HLAVNÍ entity**
- Příklady entit: place, route, activity, event
- Význam: "Kdo vytvořil toto místo/aktivitu/trasu?"

**`created_by`**
- Použití: Tvůrce **OBSAHU pod entitou**
- Příklady obsahu: riddle, media, occurrence, log entry
- Význam: "Kdo přidal tuto kešku/fotku/událost?"

**`user_id`**
- Použití: Vztah / účast / vlastnictví konkrétního uživatele
- Příklady: visit, attempt, role, checkin
- Význam: "Kterému uživateli toto patří/kdo se účastní?"

**❌ ZAKÁZÁNO:**
- `author_user_id`
- `creator_id`
- `owner_id` (pokud není výslovně odůvodněno v dokumentaci)
- `made_by`, `added_by`, nebo jakákoliv jiná domácí varianta

**EXPLICITNĚ:** Pokud se v kódu objeví `author_user_id`, jedná se o **CHYBU**. Tento název v databázi neexistuje (s výjimkou historických chyb v `place_media`, které jsou určené k refactoru). Použití tohoto názvu způsobí runtime error.

### 4) Časová pole

- **Vytvoření:** `created_at` (timestamp with time zone)
- **Aktualizace:** `updated_at` (timestamp with time zone) — pouze pokud má smysl
- **Jiné časové události:** `<action>_at` formát (např. `confirmed_at`, `resolved_at`, `starts_at`)
- **ZAKÁZÁNO:** `date_created`, `timestamp`, `time`, `datetime`

### 5) Boolean hodnoty

- **VŽDY prefix** `is_`
- **Příklady:** `is_active`, `is_hidden`, `is_public`, `is_correct`
- **ZAKÁZÁNO:** `active`, `hidden`, `visible` (bez prefixu), `status` (pokud je boolean)

---

## Příklady z aktuální DB

### ✅ SPRÁVNĚ (dodržuje ústavu)

```
places.author_id          → autor hlavní entity (místo)
place_riddles.created_by  → tvůrce obsahu (kešky pod místem)
place_visits.user_id      → vztah uživatele (návštěva)
activities.created_by     → tvůrce hlavní entity aktivity
journal_entries.user_id   → vlastník záznamu
```

### ❌ ŠPATNĚ (porušuje ústavu)

```
place_media.author_user_id
  └─ Historická chyba, určená k budoucímu refactoru
  └─ NEPOUŽÍVAT v novém kódu
  └─ Mělo by být: created_by (nebo user_id podle kontextu)
```

---

## Povinný checklist před psaním kódu

Před tím, než napíšeš jakýkoliv SQL dotaz, API endpoint, nebo DB funkci, projdi tento checklist:

- [ ] **Ověřil jsem název sloupce v Supabase** (Table Editor / SQL Editor / Schema)
- [ ] **Nepoužil jsem domněnku ani „odhad"** — skutečný název z DB
- [ ] **Používám přesný název sloupce z DB** — bez úprav, bez "vylepšení"
- [ ] **Pokud jsem přidal nový sloupec, aktualizoval jsem** `docs/db-schema.md`
- [ ] **Nezavedl jsem novou variantu existujícího názvu** (např. `author_user_id` místo `author_id`)
- [ ] **Pokud jsem porušil pravidlo, je to zdokumentováno** s jasným odůvodněním

Pokud nemůžeš zaškrtnout všechny body, NEPOKRAČUJ v psaní kódu.

---

## Weelio workflow (povinný postup)

Tento workflow je **závazný** pro všechny změny týkající se databáze:

### 1. SQL Introspection
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### 2. Aktualizace dokumentace
- Otevři `docs/db-schema.md`
- Aktualizuj schéma tabulky, pokud se změnilo
- Zachovej abecední pořadí tabulek

### 3. Kontrola proti ústavě
- Projdi pravidla v tomto dokumentu
- Ověř, že nové názvy dodržují konvence
- Zkontroluj, že neporušuješ pravidlo č. 3 (autor/tvůrce)

### 4. Teprve POTOM psát kód
- TypeScript typy musí odpovídat DB
- SQL dotazy musí používat přesné názvy sloupců
- Žádné "možná to bude takhle" — jistota

### 5. Při pochybnostech: STOP a ověř
- Raději 5 minut kontroly než 2 hodiny debugování
- Pokud název neznáš → Supabase → ověř → teprve pak použij

---

## Závěrečné ustanovení

**Tato ústava má přednost před pohodlím, rychlostí i osobními preferencemi.**

Porušení těchto pravidel není "jen stylistická věc" — je to **technický dluh**, který vede k:
- Runtime chybám v produkci
- Nefunkčním deploymentům
- Ztrátě času při debugování
- Nespolehlivé aplikaci

Cílem této ústavy je **stabilita, čitelnost a dlouhodobá udržitelnost** projektu. Dodržování těchto pravidel není volitelné.

---

**Platnost:** Od okamžiku commitu tohoto dokumentu
**Revize:** Při každé zásadní změně DB architektury
**Správce:** Lead developer projektu Weelio
