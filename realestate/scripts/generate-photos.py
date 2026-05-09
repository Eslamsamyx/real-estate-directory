#!/usr/bin/env python3
"""Generate consistent architectural photos for the 12 listings.

Reads the API key from `GEMINI_API_KEY` env var. Tries Imagen 4 → Imagen 3 →
Gemini 2.5 Flash Image (Nano Banana) in order, so the script works on free or
paid AI Studio accounts. Writes PNGs to realestate/photos/<id>.png.

Usage:
    GEMINI_API_KEY=... python3 realestate/scripts/generate-photos.py
    GEMINI_API_KEY=... python3 realestate/scripts/generate-photos.py --only L001 L002
    GEMINI_API_KEY=... python3 realestate/scripts/generate-photos.py --force      # regenerate even if file exists
    GEMINI_API_KEY=... python3 realestate/scripts/generate-photos.py --model imagen-4

The key is never logged or written to disk. Re-running is idempotent — files
that already exist are skipped unless --force is passed.
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------------------
# Style preamble — applied to every prompt. Drives the visual consistency.
# ---------------------------------------------------------------------------
STYLE = (
    "Professional architectural real-estate photography, taken at golden hour. "
    "Wide-angle exterior shot, framed for a property listing thumbnail. "
    "Warm afternoon light, soft long shadows, clear sky. Lush mature vegetation. "
    "No people. No signs, no text, no watermarks, no logos. "
    "Realistic, slightly stylized, cinematic editorial look. "
    "Natural color, balanced exposure, high detail, sharp focus. 16:11 framing."
)

# ---------------------------------------------------------------------------
# Per-listing prompts. Each entry is a list of 5 prompts:
#   [0] hero exterior   → /realestate/photos/<id>.png
#   [1-4] interior/detail variations → /realestate/photos/<id>-1.png ... -4.png
# Drawn from the data in realestate/data/listings.js so each photo matches the
# listing's title, type, materials, and neighborhood — keeping a consistent
# visual story across the 5 tiles per property.
# ---------------------------------------------------------------------------
PROMPTS = {
    "L001": [
        # Hero
        "A contemporary single-story Hill Country home in Austin Texas. "
        "Cedar and limestone exterior, large floor-to-ceiling glass walls, "
        "low-pitched standing-seam metal roof, covered lanai with stone "
        "fireplace, mature live oaks, limestone driveway, native Texas "
        "landscaping with agave and oak.",
        # 1: great room
        "Interior great room of a contemporary Hill Country home: vaulted "
        "wood-paneled ceiling with exposed beams, walls of glass opening to "
        "a covered lanai, light oak hardwood floors, neutral linen sectional, "
        "limestone fireplace, golden afternoon light pouring in.",
        # 2: kitchen
        "Modern Hill Country kitchen with a quartz waterfall island, soft-close "
        "cabinetry in light oak, integrated stainless appliances, brass "
        "pendant lights, butler's pantry visible, large windows with golden "
        "hour light, polished concrete floors.",
        # 3: primary suite
        "Primary suite of a Hill Country modern home: wood-paneled vaulted "
        "ceiling, low platform bed with linen bedding, walls of glass to a "
        "private patio with mature oaks, oak hardwood, warm morning light.",
        # 4: outdoor lanai
        "Outdoor covered lanai of a Hill Country modern home: limestone "
        "fireplace, exposed cedar ceiling, comfortable outdoor sectional, "
        "view through walls of glass into the great room, mature live oaks, "
        "golden hour light, native landscape edges.",
    ],
    "L002": [
        "A restored 1948 Texas craftsman bungalow in East Austin. Sage-green "
        "clapboard siding with white trim, deep wraparound front porch with "
        "tapered wooden columns, exposed rafter tails, gabled roof, native "
        "xeriscape front yard with succulents and limestone, mature pecan "
        "tree casting dappled shade.",
        "Interior living room of a 1948 East Austin craftsman bungalow: "
        "original heart-pine wood floors, painted beadboard ceiling, antique "
        "kilim rug, vintage Eames lounge chair, painted built-in bookshelves "
        "flanking a small fireplace, soft afternoon light.",
        "Open kitchen of a restored craftsman bungalow: white shaker cabinetry, "
        "butcher block countertops, breakfast nook with built-in banquette and "
        "navy cushions, painted beadboard, vintage glass pendant light, "
        "soft natural light through tall windows.",
        "Primary bedroom of a craftsman bungalow with original heart-pine "
        "floors, painted beadboard ceiling, antique iron bed frame with crisp "
        "white linens, vintage dressing table, wool rug, dappled afternoon "
        "light through tall windows.",
        "Detached studio guesthouse behind an East Austin craftsman bungalow: "
        "painted board-and-batten exterior with sage trim, French doors open, "
        "interior visible with a daybed and desk, succulent garden, wooden "
        "pergola with string lights, warm evening light.",
    ],
    "L003": [
        "A 1962 mid-century modern home in Zilker, Austin Texas. Vaulted "
        "tongue-and-groove wood ceilings visible through clerestory windows, "
        "post-and-beam construction, walls of glass, butterfly roofline, "
        "warm wood and limestone facade, mature pecan and cedar trees, "
        "minimalist front lawn with stepping stones.",
        "Sunken living room of a 1962 mid-century modern home: vaulted "
        "tongue-and-groove wood ceiling, original floor-to-ceiling stone "
        "fireplace, walls of glass to a backyard, vintage Eames lounge "
        "chair and ottoman, area rug, golden afternoon light.",
        "Mid-century modern kitchen with original walnut cabinets, warm "
        "stone countertops, vintage glass pendant lighting, exposed beam "
        "ceiling, breakfast bar with vintage stools, glass doors opening to "
        "a back patio with pebble pool.",
        "Mid-century modern primary bedroom with vaulted T&G ceiling, walls "
        "of glass to a private garden, low-profile platform bed with "
        "neutral linens, vintage walnut nightstands, area rug on terrazzo "
        "floors, soft morning light.",
        "Pebble pool in the backyard of a mid-century modern home in Zilker "
        "Austin: surrounded by mature pecans and cedars, native landscape, "
        "terraced concrete patio with vintage outdoor lounge chairs, golden "
        "hour light raking across the water.",
    ],
    "L004": [
        "A modern three-story townhouse in Hyde Park, Austin Texas. White "
        "stucco facade with dark metal accents, narrow vertical windows, "
        "ground-level two-car garage, visible rooftop terrace pergola at the "
        "top, walkable urban neighborhood with sidewalks and small front "
        "trees, contemporary residential streetscape.",
        "Interior open-plan great room of a modern Hyde Park townhouse: "
        "white walls, oak hardwood floors, modern grey sectional, dark metal "
        "accents, contemporary art, kitchen visible behind, large windows "
        "with afternoon light.",
        "Modern townhouse kitchen with a peninsula island, white quartz "
        "countertops, matte black cabinetry, integrated stainless appliances, "
        "brass pendant lights, oak hardwood, large windows with neighborhood "
        "trees visible.",
        "Modern townhouse primary bedroom with neutral linen platform bed, "
        "dark metal accents, walk-in closet visible through pocket doors, "
        "large floor-to-ceiling windows, oak hardwood floors, morning light.",
        "Rooftop terrace of a Hyde Park townhouse in Austin: warm wooden "
        "deck, modern outdoor sectional with cushions, low planters with "
        "herbs, downtown Austin skyline visible in the distance, evening "
        "string lights overhead, golden hour.",
    ],
    "L005": [
        "A glass downtown high-rise residential tower in Austin Texas, viewed "
        "from a tree-lined street at golden hour. Floor-to-ceiling windows "
        "across the entire facade, slim metal mullions, warm reflections of "
        "the setting sun on the glass, urban streetscape with tall live oaks, "
        "modern luxury residential architecture.",
        "Interior corner living room of a 21st-floor downtown Austin high-rise "
        "condo: floor-to-ceiling windows wrapping two walls, oak hardwood "
        "floors, modern white sectional, contemporary art, view of the Texas "
        "Capitol and city skyline at golden hour.",
        "Modern condo kitchen with a white quartz waterfall island, "
        "integrated panel-front appliances, sleek European cabinetry, brass "
        "pendant lights, oak floors, downtown Austin skyline visible "
        "through floor-to-ceiling glass.",
        "Modern condo primary bedroom with a low platform bed, crisp neutral "
        "linens, floor-to-ceiling windows on two sides, downtown skyline "
        "view, oak hardwood floors, sheer linen curtains, golden hour light.",
        "Rooftop pool of a downtown Austin luxury high-rise: infinity-edge "
        "pool, modern teak lounge chairs, downtown skyline backdrop, evening "
        "light reflecting on the water, planters with sculptural plants.",
    ],
    "L006": [
        "A stately Tarrytown estate in Austin Texas on a wooded acre. "
        "Limestone and cream stucco facade, slate roof, formal arched entry "
        "with iron lantern, paneled wood front door, mature live oaks framing "
        "the property, manicured emerald lawn, gas lamp posts lining a curved "
        "driveway, traditional luxury residential architecture.",
        "Formal living room of a Tarrytown estate: limestone fireplace, "
        "wide-plank oak hardwood floors, traditional upholstered sofas in "
        "muted linen, antique oriental rug, French doors opening to a formal "
        "garden, afternoon light filtering through tall windows.",
        "Traditional chef's kitchen of a Tarrytown estate: marble countertops, "
        "custom millwork cabinetry painted soft cream, large island with "
        "marble top, professional brass range hood and Lacanche range, "
        "breakfast nook with bay window, wide-plank oak floors.",
        "Paneled study of a Tarrytown estate: floor-to-ceiling oak bookshelves, "
        "leather chesterfield sofa, fireplace, traditional desk with brass "
        "library lamp, oriental rug, warm afternoon light pouring in.",
        "Pool and pool house of a Tarrytown estate: rectangular pool with "
        "limestone deck, formal manicured landscaping, mature live oaks, "
        "small pool house with pergola and outdoor lounge furniture, golden "
        "hour light.",
    ],
    "L007": [
        "An industrial loft building exterior on South Lamar in Austin Texas. "
        "Exposed red brick and weathered steel facade, large factory-style "
        "multi-pane warehouse windows, converted warehouse aesthetic, ground "
        "floor cafe with bistro chairs at the corner, evening urban vibe, "
        "string lights overhead.",
        "Interior of a South Lamar industrial loft: exposed steel I-beams "
        "and ductwork in the ceiling, polished concrete floors, exposed red "
        "brick wall, modern leather chesterfield sofa, vintage industrial "
        "pendant lights, large factory windows with evening city light.",
        "Industrial loft kitchen with stainless steel countertops and "
        "backsplash, exposed red brick wall behind, vintage industrial "
        "pendant lights, butcher block island with vintage metal stools, "
        "polished concrete floors.",
        "Industrial loft bedroom: exposed steel beams, brick wall, low "
        "platform bed with charcoal linen bedding, vintage Persian rug, "
        "large factory window with afternoon city light streaming in.",
        "Detail of a South Lamar industrial loft: vintage Eames lounge chair "
        "by a tall factory window, exposed red brick wall, polished concrete "
        "floor, evening city light, single sculptural floor lamp.",
    ],
    "L008": [
        "A new-urbanist Craftsman-influenced home in Mueller, Austin Texas. "
        "Front porch with tapered wooden columns, mixed-material siding "
        "(board-and-batten plus cedar shingle gable), small tidy front yard "
        "with native plants, alley-loaded garage barely visible, walkable "
        "neighborhood with sidewalks, neighbor's matching house in soft focus.",
        "Interior family room of a new-urbanist Mueller home: open floor "
        "plan, oak hardwood floors, comfortable navy linen sectional, kitchen "
        "island visible beyond, large windows looking onto the front porch, "
        "afternoon light, kids' books on the coffee table.",
        "Mueller new-urbanist kitchen: white shaker cabinetry, white quartz "
        "countertops, large island with seating for four, brass pendant "
        "lights, breakfast nook with built-in banquette, French doors to a "
        "small back garden.",
        "Mudroom of a Mueller family home: built-in oak cubbies for kids' "
        "backpacks, bench with cushion, brass coat hooks, afternoon light "
        "streaming in, walkable neighborhood path visible through the back "
        "window.",
        "Backyard of a Mueller family home: small lawn, raised cedar garden "
        "beds with vegetables, alley garage in the background, mature shade "
        "trees, evening string lights, neighbors' homes in soft focus.",
    ],
    "L009": [
        "A 1950s Texas cottage in Barton Hills, Austin. Limestone front wall, "
        "pitched gable roof with weathered cedar shake shingles, screened "
        "side porch with wooden railing, native vegetation on a wooded lot "
        "with tall oaks and yaupon holly, dappled afternoon light filtering "
        "through the canopy.",
        "Interior living room of a 1950s Barton Hills cottage: limestone "
        "fireplace, beamed wooden ceiling, oak hardwood floors, comfortable "
        "linen upholstered chairs, vintage area rug, French doors opening to "
        "the wooded greenbelt, dappled afternoon light.",
        "Updated cottage kitchen: painted white cabinetry, butcher block "
        "countertops, vintage white enameled stove, exposed beam ceiling, "
        "small breakfast table by a garden window, afternoon light streaming "
        "through tall trees outside.",
        "Screened porch of a Barton Hills cottage: oak floor, white wicker "
        "furniture with cushions, ferns hanging from the rafters, view into "
        "the wooded greenbelt with dappled afternoon light filtering through "
        "the canopy, ceiling fan above.",
        "Backyard of a Barton Hills cottage backing to the greenbelt: native "
        "Texas landscaping, stone pathway winding through the trees, mature "
        "live oaks, soft afternoon light filtering through the canopy, small "
        "stone bench in a clearing.",
    ],
    "L010": [
        "A modern penthouse atop a glass mid-rise residential building in "
        "Domain Northside Austin Texas. Visible 1200-square-foot private "
        "terrace with planters and outdoor furniture, floor-to-ceiling "
        "windows, sleek metal railings, urban skyline backdrop with mid-rise "
        "buildings, golden hour reflections, luxury contemporary architecture.",
        "Penthouse living room with floor-to-ceiling windows on two sides, "
        "modern white sectional, designer brass coffee table, abstract art "
        "on a feature wall, oak hardwood floors, view of the Domain skyline "
        "at golden hour.",
        "Bulthaup kitchen of a modern penthouse: matte black cabinetry, "
        "marble waterfall island, integrated panel-front appliances, slim "
        "brass pendant lights, neutral palette, large windows with skyline "
        "view.",
        "Penthouse primary suite with floor-to-ceiling windows, low platform "
        "bed with crisp linen bedding, dressing room visible through pocket "
        "doors, oak hardwood floors, neutral linen curtains, golden hour "
        "light pouring in.",
        "1200-square-foot private terrace of a Domain Northside penthouse: "
        "modern outdoor sectional with grey cushions, dining table for six, "
        "low planters with sculptural plants, glass railing, urban skyline "
        "backdrop, golden hour light.",
    ],
    "L011": [
        "A 1939 Texas bungalow in Travis Heights, Austin. Cream stucco walls "
        "with red clay tile roof accents, deep front porch with painted "
        "wooden columns and porch swing, terraced limestone retaining walls "
        "leading up from the sidewalk, mature crepe myrtle trees in bloom, "
        "vintage iron mailbox at the curb.",
        "Living room of a 1939 Travis Heights bungalow: original tile "
        "fireplace surround in soft greens and creams, oak hardwood floors, "
        "vintage Persian rugs, comfortable linen-upholstered chairs, French "
        "doors to the front porch, warm afternoon light.",
        "Charmingly updated kitchen of a 1939 Texas bungalow: original tile "
        "backsplash in pale green and cream, painted white cabinetry, "
        "butcher block countertops, vintage white range, breakfast nook with "
        "built-in seating and a circular table.",
        "Wood-paneled den of a Travis Heights bungalow: built-in oak shelves "
        "with books and ceramics, leather club chair, vintage Persian rug, "
        "small fireplace, framed art on the wood walls, late-afternoon light "
        "through tall casement windows.",
        "Deep front porch of a Travis Heights bungalow: painted white wooden "
        "columns, blue porch swing with cushions, ferns in terracotta pots, "
        "view of the South Congress neighborhood at golden hour, ceiling "
        "painted haint blue overhead.",
    ],
    "L012": [
        "A hilltop Westlake Austin Texas home with western lake views. Modern "
        "Hill Country architecture in limestone and dark metal, walls of "
        "glass overlooking Lake Austin in the distance, infinity pool visible "
        "in the foreground, mature live oaks framing the view, golden hour "
        "light raking across the facade, luxury contemporary residential.",
        "Great room of a Westlake hilltop home: walls of glass overlooking "
        "Lake Austin, limestone fireplace, oak hardwood floors, modern "
        "neutral sectional, contemporary art, golden hour light raking "
        "across the room and warming the limestone wall.",
        "Modern Westlake kitchen with a marble waterfall island, custom "
        "dark walnut cabinetry, professional brass range hood, integrated "
        "appliances, breakfast bar with leather stools, lake views through "
        "floor-to-ceiling windows beyond.",
        "Primary suite of a Westlake hilltop home: low platform bed with "
        "crisp white linens, walls of glass with sweeping Lake Austin views, "
        "oak hardwood, neutral linen curtains, sunrise light pouring in over "
        "the lake.",
        "Infinity-edge pool of a Westlake Austin hilltop home at golden hour: "
        "the pool seems to flow into Lake Austin in the distance, limestone "
        "deck, modern teak lounge chairs, mature live oaks framing the view, "
        "warm light raking across the water.",
    ],
}

# ---------------------------------------------------------------------------
# Models to try, in preference order.
#
# The Gemini image-generation models are paid-only on AI Studio free tier
# (their per-minute and per-day quota is literally 0). Imagen requires paid as
# well. Pollinations.ai's Flux is included as a free, no-key fallback so the
# demo can ship without a billing account; if a paid key is configured the
# Gemini/Imagen models are tried first.
# ---------------------------------------------------------------------------
MODELS = [
    ("nano-banana-pro-preview", "gemini"),
    ("gemini-3-pro-image-preview", "gemini"),
    ("gemini-3.1-flash-image-preview", "gemini"),
    ("gemini-2.5-flash-image", "gemini"),
    ("imagen-4.0-ultra-generate-001", "imagen"),
    ("imagen-4.0-generate-001", "imagen"),
    ("imagen-4.0-fast-generate-001", "imagen"),
    ("flux", "pollinations"),
]

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "photos"
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)


def call_imagen(model: str, prompt: str, api_key: str) -> bytes:
    """Call an Imagen-family model. Returns raw image bytes."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict"
        f"?key={api_key}"
    )
    body = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "4:3",  # closest of supported ratios to our 16:11 card
            "personGeneration": "DONT_ALLOW",
        },
    }).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())
    pred = data.get("predictions") or []
    if not pred or "bytesBase64Encoded" not in pred[0]:
        raise RuntimeError(f"unexpected imagen response: {json.dumps(data)[:300]}")
    return base64.b64decode(pred[0]["bytesBase64Encoded"])


def call_pollinations(model: str, prompt: str, _api_key: str) -> bytes:
    """Call Pollinations.ai (free, no auth). 1024x704 ≈ 16:11 to match cards."""
    import urllib.parse
    url = (
        f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}"
        f"?width=1024&height=704&model={model}&seed=42&nologo=true&enhance=true"
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15.7) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/png,image/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    req = urllib.request.Request(url, method="GET", headers=headers)
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


def call_gemini(model: str, prompt: str, api_key: str) -> bytes:
    """Call a Gemini multimodal image-generating model."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())
    parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    for p in parts:
        inline = p.get("inlineData") or p.get("inline_data")
        if inline and "data" in inline:
            return base64.b64decode(inline["data"])
    raise RuntimeError(f"no image in gemini response: {json.dumps(data)[:300]}")


def generate_one(prompt: str, api_key: str, force_model: str = None) -> tuple[bytes, str]:
    """Try each model in turn until one works. Returns (image_bytes, model_used)."""
    full_prompt = STYLE + " " + prompt
    candidates = MODELS
    if force_model:
        candidates = [
            (m, kind) for (m, kind) in MODELS
            if m == force_model or m.startswith(force_model)
        ]
        if not candidates:
            raise RuntimeError(f"no matching model for --model {force_model}")

    last_err = None
    for model, kind in candidates:
        try:
            if kind == "imagen":
                return call_imagen(model, full_prompt, api_key), model
            if kind == "pollinations":
                return call_pollinations(model, full_prompt, api_key), f"pollinations/{model}"
            return call_gemini(model, full_prompt, api_key), model
        except urllib.error.HTTPError as e:
            body_excerpt = e.read().decode("utf-8", errors="replace")[:300]
            last_err = f"{model}: HTTP {e.code} {body_excerpt}"
            print(f"    {last_err}", file=sys.stderr)
            # 4xx other than 429 → permanently fail for this model, move on
            # 429 → could retry but we just move on; user can re-run
            continue
        except Exception as e:  # noqa: BLE001
            last_err = f"{model}: {e}"
            print(f"    {last_err}", file=sys.stderr)
            continue
    raise RuntimeError(f"all models failed; last: {last_err}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--only", nargs="*", help="only generate these listing IDs")
    ap.add_argument("--force", action="store_true", help="regenerate even if exists")
    ap.add_argument("--model", help="force a specific model (substring match)")
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: set GEMINI_API_KEY (or GOOGLE_API_KEY) env var", file=sys.stderr)
        return 2

    targets = args.only if args.only else list(PROMPTS.keys())
    unknown = [t for t in targets if t not in PROMPTS]
    if unknown:
        print(f"ERROR: unknown listing IDs: {unknown}", file=sys.stderr)
        print(f"available: {list(PROMPTS.keys())}", file=sys.stderr)
        return 2

    total_photos = sum(len(PROMPTS[lid]) for lid in targets)
    print(f"Generating up to {total_photos} photo(s) into {PHOTOS_DIR}")
    print(f"  ({len(targets)} listing(s) × {len(next(iter(PROMPTS.values())))} variations)")
    print(f"Style: {STYLE[:80]}…")
    print()

    n_done = 0
    n_skip = 0
    n_fail = 0
    for lid in targets:
        prompt_list = PROMPTS[lid]
        for idx, prompt in enumerate(prompt_list):
            suffix = "" if idx == 0 else f"-{idx}"
            label = lid + (suffix or " ")
            out = PHOTOS_DIR / f"{lid}{suffix}.png"
            if out.exists() and not args.force:
                print(f"  skip   {label}  ({out.stat().st_size // 1024} KB exists)")
                n_skip += 1
                continue
            print(f"  → {label}  generating…", end="", flush=True)
            try:
                img, model = generate_one(prompt, api_key, args.model)
                out.write_bytes(img)
                print(f"  ✓ {len(img) // 1024} KB via {model}")
                n_done += 1
                time.sleep(0.5)  # gentle pacing
            except Exception as e:  # noqa: BLE001
                print(f"  ✗ failed: {e}")
                n_fail += 1

    print()
    print(f"done — {n_done} generated, {n_skip} skipped, {n_fail} failed")
    print(f"photos in {PHOTOS_DIR}")
    return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
