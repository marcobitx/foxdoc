#!/usr/bin/env python3
# test_landing.py
# Pilnas foxDoc landing page testas - patikrina visus puslapius, navigaciją ir turinio korektiškumą

from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:4321"

PAGES = [
    ("/", "Pagrindinis"),
    ("/features", "Funkcijos"),
    ("/pricing", "Kainos"),
    ("/use-cases", "Naudojimo atvejai"),
    ("/about", "Apie"),
    ("/docs", "Dokumentacija"),
    ("/docs/getting-started", "Pradžia"),
    ("/docs/credits", "Kreditai"),
    ("/forum", "Forumas"),
]

errors = []
warnings = []

def log_ok(msg):
    print(f"  [OK] {msg}")

def log_fail(msg):
    print(f"  [KLAIDA] {msg}")
    errors.append(msg)

def log_warn(msg):
    print(f"  [ISPEJIMAS] {msg}")
    warnings.append(msg)

def check_nav_links(page, url):
    """Patikrina nav nuorodas kiekviename puslapyje"""
    nav_links = page.locator("nav a").all()
    if len(nav_links) == 0:
        log_warn(f"{url}: Nerasta nav nuorodų")
    else:
        log_ok(f"{url}: Rasta {len(nav_links)} nav nuorodų")
    return nav_links

def check_no_broken_text(page, url):
    """Tikrina ar nėra placeholder teksto"""
    body_text = page.locator("body").inner_text()
    bad_patterns = ["Lorem ipsum", "TODO", "PLACEHOLDER", "undefined", "null", "NaN", "[object", "Error:"]
    for pattern in bad_patterns:
        if pattern.lower() in body_text.lower():
            log_fail(f"{url}: Rastas placeholder/klaidos tekstas: '{pattern}'")

def check_images(page, url):
    """Tikrina ar visos nuotraukos užsikrauna"""
    images = page.locator("img").all()
    broken = 0
    for img in images:
        src = img.get_attribute("src") or ""
        natural_width = page.evaluate("(el) => el.naturalWidth", img.element_handle())
        if natural_width == 0 and src and not src.startswith("data:"):
            broken += 1
            log_warn(f"{url}: Sugadinta nuotrauka: {src}")
    if broken == 0:
        log_ok(f"{url}: Visos {len(images)} nuotraukos užsikrauna")

def check_links_not_empty(page, url):
    """Tikrina ar nuorodos turi href"""
    links = page.locator("a").all()
    empty = [l.get_attribute("href") for l in links if not l.get_attribute("href")]
    if empty:
        log_warn(f"{url}: {len(empty)} nuorodų be href")
    else:
        log_ok(f"{url}: Visos {len(links)} nuorodos turi href")

def check_page_title(page, url):
    """Tikrina ar puslapis turi title"""
    title = page.title()
    if not title or title.strip() == "":
        log_fail(f"{url}: Trūksta title elemento")
    elif "foxDoc" in title or "Fox" in title:
        log_ok(f"{url}: Title: '{title}'")
    else:
        log_warn(f"{url}: Title nenurodo foxDoc: '{title}'")

def check_console_errors(page, url, console_messages):
    """Tikrina ar nėra JS klaidų"""
    errs = [m for m in console_messages if m["type"] == "error"]
    if errs:
        for e in errs:
            log_warn(f"{url}: JS klaida: {e['text'][:100]}")
    else:
        log_ok(f"{url}: Nėra JS klaidų")

def check_cta_buttons(page, url):
    """Tikrina ar yra CTA mygtukai"""
    btns = page.locator("a[href], button").all()
    cta_keywords = ["pradėti", "išbandyti", "registruotis", "užsisakyti", "gauti", "demo", "nemokamai", "pirkti"]
    found = []
    for btn in btns:
        text = btn.inner_text().lower()
        for kw in cta_keywords:
            if kw in text:
                found.append(btn.inner_text().strip())
                break
    if found:
        log_ok(f"{url}: Rasti CTA: {found[:3]}")
    else:
        log_warn(f"{url}: Nerasta CTA mygtukų")

def check_lithuanian_content(page, url):
    """Tikrina ar tekstas lietuviškas"""
    text = page.locator("body").inner_text().lower()
    lt_words = ["ir", "su", "tai", "viešųjų", "analizė", "dokumentai", "pirkimų", "kaina", "apie", "pradžia"]
    found = sum(1 for w in lt_words if w in text)
    if found >= 3:
        log_ok(f"{url}: Tekstas lietuviškas ({found} LT žodžiai rasti)")
    else:
        log_warn(f"{url}: Mažai lietuviško teksto (rasta {found} LT žodžių)")

def check_footer(page, url):
    """Tikrina ar yra footer"""
    footer = page.locator("footer")
    if footer.count() > 0:
        log_ok(f"{url}: Footer rastas")
        footer_text = footer.inner_text()
        if "foxdoc" in footer_text.lower() or "fox" in footer_text.lower():
            log_ok(f"{url}: Footer turi brendo pavadinimą")
    else:
        log_warn(f"{url}: Footer nerastas")

def check_mobile_viewport(page, url):
    """Patikrina ar puslapis atrodo gerai mobiliame"""
    page.set_viewport_size({"width": 375, "height": 812})
    page.wait_for_load_state("networkidle")
    # Tikrina ar nėra horizontalaus slinkimo
    overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
    if overflow:
        log_warn(f"{url}: Horizontalus overflow mobiliame")
    else:
        log_ok(f"{url}: Mobilusis rodinys korektiškas")
    # Grąžina į desktop
    page.set_viewport_size({"width": 1280, "height": 800})

def test_page_navigation(page):
    """Tikrina vidinę navigaciją (nav nuorodos veikia)"""
    print("\n[Navigacijos testas]")
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    nav_hrefs = []
    for a in page.locator("nav a").all():
        href = a.get_attribute("href")
        if href and href.startswith("/") and href != "/":
            nav_hrefs.append(href)

    tested = set()
    for href in nav_hrefs:
        if href in tested:
            continue
        tested.add(href)
        response = page.goto(f"{BASE_URL}{href}")
        page.wait_for_load_state("networkidle")
        status = response.status if response else 0
        if status == 200:
            log_ok(f"Navigacija į {href}: {status}")
        elif status == 404:
            log_fail(f"Navigacija į {href}: 404 NE RASTAS")
        else:
            log_warn(f"Navigacija į {href}: {status}")

def test_pricing_logic(page):
    """Tikrina kainos puslapio logiką"""
    print("\n[Kainų puslapio testas]")
    page.goto(f"{BASE_URL}/pricing")
    page.wait_for_load_state("networkidle")

    text = page.locator("body").inner_text()

    # Tikrina ar yra kainų planai
    price_indicators = ["€", "EUR", "nemokama", "planas", "mėn", "metinis"]
    found = [p for p in price_indicators if p.lower() in text.lower()]
    if found:
        log_ok(f"Kainos rodikiai rasti: {found}")
    else:
        log_warn("Nerasta kainų/valiutos rodiklių")

    # Tikrina ar yra keli planai
    plan_headings = page.locator("h2, h3").all()
    log_ok(f"Rasta {len(plan_headings)} antraščių kainų puslapyje")

def test_features_completeness(page):
    """Tikrina funkcijų puslapio išsamumą"""
    print("\n[Funkcijų puslapio testas]")
    page.goto(f"{BASE_URL}/features")
    page.wait_for_load_state("networkidle")

    text = page.locator("body").inner_text()

    expected_features = ["AI", "PDF", "DOCX", "analizė", "ataskaita", "eksportas"]
    for feat in expected_features:
        if feat.lower() in text.lower():
            log_ok(f"Funkcija '{feat}' paminėta")
        else:
            log_warn(f"Funkcija '{feat}' nepaminėta")

def test_about_page(page):
    """Tikrina 'Apie' puslapio turinį"""
    print("\n[Apie puslapio testas]")
    page.goto(f"{BASE_URL}/about")
    page.wait_for_load_state("networkidle")

    text = page.locator("body").inner_text()

    expected = ["misija", "komanda", "foxdoc", "kontakt"]
    found = [e for e in expected if e.lower() in text.lower()]
    if len(found) >= 2:
        log_ok(f"'Apie' puslapis turi pagrindines sekcijas: {found}")
    else:
        log_warn(f"'Apie' puslapis gali būti nepilnas. Rasta: {found}")

def test_docs_structure(page):
    """Tikrina dokumentacijos struktūrą"""
    print("\n[Dokumentacijos testas]")
    page.goto(f"{BASE_URL}/docs")
    page.wait_for_load_state("networkidle")

    links = page.locator("a[href*='/docs']").all()
    log_ok(f"Rasta {len(links)} docs nuorodų")

    # Tikrina getting-started
    page.goto(f"{BASE_URL}/docs/getting-started")
    page.wait_for_load_state("networkidle")
    if page.locator("body").inner_text().strip():
        log_ok("getting-started puslapis turi turinį")
    else:
        log_fail("getting-started puslapis tuščias")

def test_forum_page(page):
    """Tikrina forumo puslapį"""
    print("\n[Forumo puslapio testas]")
    page.goto(f"{BASE_URL}/forum")
    page.wait_for_load_state("networkidle")

    text = page.locator("body").inner_text()
    if len(text.strip()) > 100:
        log_ok(f"Forumas turi turinį ({len(text)} simbolių)")
    else:
        log_warn("Forumas gali būti tuščias")

def test_use_cases(page):
    """Tikrina naudojimo atvejų puslapį"""
    print("\n[Naudojimo atvejų testas]")
    page.goto(f"{BASE_URL}/use-cases")
    page.wait_for_load_state("networkidle")

    text = page.locator("body").inner_text()
    use_case_keywords = ["pirkimas", "organizacija", "tiekėj", "kontraktą", "analizė", "sutartis", "biudžet"]
    found = [k for k in use_case_keywords if k.lower() in text.lower()]
    if len(found) >= 2:
        log_ok(f"Naudojimo atvejai konkretūs: {found}")
    else:
        log_warn(f"Naudojimo atvejai gali būti per abstraktūs. Rasta: {found}")

def run_all_tests():
    print("=" * 60)
    print("foxDoc Landing Page - Pilnas testas")
    print(f"URL: {BASE_URL}")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Surinkti console žinutes kiekvienam puslapiui
        console_log = []
        page.on("console", lambda msg: console_log.append({"type": msg.type, "text": msg.text}))

        # 1. Tikrina kiekvieną puslapį atskirai
        for path, name in PAGES:
            console_log.clear()
            print(f"\n[{name}] {BASE_URL}{path}")

            try:
                response = page.goto(f"{BASE_URL}{path}")
                page.wait_for_load_state("networkidle")

                status = response.status if response else 0
                if status != 200:
                    log_fail(f"HTTP {status}")
                    continue
                else:
                    log_ok(f"HTTP {status}")

                check_page_title(page, path)
                check_no_broken_text(page, path)
                check_images(page, path)
                check_links_not_empty(page, path)
                check_cta_buttons(page, path)
                check_lithuanian_content(page, path)
                check_footer(page, path)
                check_console_errors(page, path, console_log)

            except Exception as e:
                log_fail(f"Klaida testuojant {path}: {e}")

        # 2. Mobilaus varianto tikrinimas
        print("\n[Mobilaus varianto tikrinimas]")
        for path, name in PAGES[:4]:  # Tikrina pirmus 4 puslapius
            try:
                page.goto(f"{BASE_URL}{path}")
                page.wait_for_load_state("networkidle")
                check_mobile_viewport(page, path)
            except Exception as e:
                log_warn(f"Mobilaus testo klaida {path}: {e}")

        # 3. Specifiniai testai
        test_page_navigation(page)
        test_pricing_logic(page)
        test_features_completeness(page)
        test_about_page(page)
        test_docs_structure(page)
        test_forum_page(page)
        test_use_cases(page)

        browser.close()

    # Rezultatai
    print("\n" + "=" * 60)
    print("REZULTATAI")
    print("=" * 60)
    print(f"Klaidos: {len(errors)}")
    print(f"Įspėjimai: {len(warnings)}")

    if errors:
        print("\n[KLAIDOS]:")
        for e in errors:
            print(f"  - {e}")

    if warnings:
        print("\n[ISPEJIMIAI]:")
        for w in warnings:
            print(f"  - {w}")

    if not errors and not warnings:
        print("\n[PUIKU] Visi testai praejo sekmingai!")
    elif not errors:
        print("\n[GERAI] Kladu nera, tik ispejimais.")
    else:
        print("\n[NEPAVYKO] Rasta kladu - reikia taisyti.")

    return len(errors) == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
