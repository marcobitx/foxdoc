# backend/app/prompts/analysis_types.py
# Analysis type configurations — maps analysis_type to prompt customizations
# Each type defines focus areas and thinking budget
# Related: services/extraction.py, services/aggregation.py

from app.prompts.extraction import EXTRACTION_SYSTEM, EXTRACTION_USER
from app.prompts.aggregation import AGGREGATION_SYSTEM, AGGREGATION_USER

# ── Analysis type definitions ─────────────────────────────────────────────────

ANALYSIS_TYPES = {
    "quick": {
        "thinking": "off",
        "extraction_focus": """\

## FOKUSAS: GREITA APŽVALGA
Šiai analizei reikia TIK pagrindinės informacijos. Užpildyk tik šiuos laukus:
- project_title — trumpas pirkimo pavadinimas
- project_summary — 2-3 sakiniai, kas perkama ir kam
- estimated_value — vertė ir valiuta
- deadlines — pasiūlymų pateikimo terminas
- procuring_organization — organizacijos pavadinimas ir kontaktai
- procurement_reference — pirkimo numeris
- procurement_type — pirkimo būdas
- cpv_codes — CPV kodai

Kitus laukus PRALEISK arba užpildyk minimaliai. Tikslas — greita apžvalga per 30 sekundžių.""",
        "aggregation_focus": """\

## FOKUSAS: GREITA APŽVALGA
Sukurk TRUMPĄ suvestinę su pagrindiniais faktais:
- project_title, project_summary (2-3 sakiniai)
- estimated_value, deadlines
- procuring_organization
- procurement_reference, procurement_type
Kitus laukus užpildyk tik jei informacija aiški ir lengvai prieinama. Neskirk laiko detaliai analizei.""",
    },
    "requirements": {
        "thinking": "low",
        "extraction_focus": """\

## FOKUSAS: REIKALAVIMAI IR KVALIFIKACIJA
Šiai analizei PRIORITETIZUOK šiuos laukus — jie turi būti MAKSIMALIAI detalūs:
- qualification_requirements — VISI kvalifikacijos reikalavimai, pašalinimo pagrindai, reikalaujami dokumentai
- technical_specifications — detalūs techniniai reikalavimai su mandatory/optional
- evaluation_criteria — vertinimo kriterijai, svoriai, formulės
- submission_requirements — pasiūlymo forma, kalba, struktūra, priedai
- key_requirements — kiekvienas techninis reikalavimas

Kitus laukus (project_title, estimated_value, deadlines, procuring_organization) užpildyk, bet nereikia gilintis.""",
        "aggregation_focus": """\

## FOKUSAS: REIKALAVIMAI IR KVALIFIKACIJA
Ataskaita turi būti orientuota į REIKALAVIMUS:
- qualification_requirements — PILNAS sąrašas su visomis detalėmis
- technical_specifications — kiekvienas techninis reikalavimas
- evaluation_criteria — tikslūs kriterijai ir svoriai
- submission_requirements — kaip pateikti pasiūlymą
- key_requirements — svarbiausios techninės sąlygos
Šie laukai turi būti IŠSAMIAUSI. Kitus užpildyk standartiškai.""",
    },
    "risks": {
        "thinking": "low",
        "extraction_focus": """\

## FOKUSAS: RIZIKŲ ANALIZĖ
Šiai analizei PRIORITETIZUOK šiuos laukus — jie turi būti MAKSIMALIAI detalūs:
- risk_factors — VISOS rizikos: baudos, netesybos, terminų pažeidimai, kokybės reikalavimai
- financial_terms — mokėjimo sąlygos, garantijos, delspinigiai, baudos, draudimas
- special_conditions — ypatingos sutarties sąlygos, apribojimai
- deadlines — VISI terminai su pasekmėmis už vėlavimą
- contract_duration — sutarties trukmė ir pratęsimo sąlygos

Kiekvieną riziką aprašyk su KONKREČIAIS skaičiais (baudos %, terminai, sumos).
Kitus laukus užpildyk standartiškai.""",
        "aggregation_focus": """\

## FOKUSAS: RIZIKŲ ANALIZĖ
Ataskaita turi aiškiai identifikuoti VISAS rizikas tiekėjui:
- risk_factors — PILNAS rizikų sąrašas su severity ir konkrečiais skaičiais
- financial_terms — baudos, netesybos, garantijos, delspinigiai (tikslūs %)
- special_conditions — neįprastos ar griežtos sąlygos
- deadlines — terminai ir pasekmės už vėlavimą
Kiekvieną riziką vertink pagal svarbumą (high/medium/low).
Kitus laukus užpildyk standartiškai.""",
    },
    "detailed": {
        "thinking": "low",
        "extraction_focus": "",  # No additional focus — uses full default prompt
        "aggregation_focus": "",
    },
    "custom": {
        "thinking": "low",
        "extraction_focus": "",  # Will be filled dynamically with user instructions
        "aggregation_focus": "",
    },
}


VALID_THINKING_LEVELS = {"off", "low", "medium", "high"}


def get_thinking_level(analysis_type: str, thinking_override: str = "") -> str:
    """Get the thinking budget level.

    If thinking_override is a valid level, it takes priority over the
    analysis type's default. This lets the user control thinking depth
    independently of the analysis type.
    """
    if thinking_override and thinking_override in VALID_THINKING_LEVELS:
        return thinking_override
    config = ANALYSIS_TYPES.get(analysis_type, ANALYSIS_TYPES["detailed"])
    return config["thinking"]


def get_extraction_prompts(
    analysis_type: str, custom_instructions: str = ""
) -> tuple[str, str]:
    """Return (system_prompt, user_template) for the extraction phase.

    For custom type, appends user instructions to system prompt.
    For focused types, appends focus section to system prompt.
    User template is always EXTRACTION_USER (has {filename}, {document_type}, etc.).
    """
    config = ANALYSIS_TYPES.get(analysis_type, ANALYSIS_TYPES["detailed"])
    system = EXTRACTION_SYSTEM

    if analysis_type == "custom" and custom_instructions.strip():
        system += f"\n\n## VARTOTOJO INSTRUKCIJOS\n{custom_instructions.strip()}"
    elif config["extraction_focus"]:
        system += config["extraction_focus"]

    return system, EXTRACTION_USER


def get_aggregation_prompts(
    analysis_type: str, custom_instructions: str = ""
) -> tuple[str, str]:
    """Return (system_prompt, user_template) for the aggregation phase.

    For custom type, appends user instructions to system prompt.
    For focused types, appends focus section to system prompt.
    User template is always AGGREGATION_USER (has {doc_count}, {per_doc_results}).
    """
    config = ANALYSIS_TYPES.get(analysis_type, ANALYSIS_TYPES["detailed"])
    system = AGGREGATION_SYSTEM

    if analysis_type == "custom" and custom_instructions.strip():
        system += f"\n\n## VARTOTOJO INSTRUKCIJOS\n{custom_instructions.strip()}"
    elif config["aggregation_focus"]:
        system += config["aggregation_focus"]

    return system, AGGREGATION_USER
