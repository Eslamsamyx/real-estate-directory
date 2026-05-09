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
# Per-listing prompts. Drawn from the data in realestate/data/listings.js so
# each photo matches the listing's title, type, and neighborhood.
# ---------------------------------------------------------------------------
PROMPTS = {
    "L001": (
        "A contemporary single-story Hill Country home in Austin Texas. "
        "Cedar and limestone exterior, large floor-to-ceiling glass walls, "
        "low-pitched standing-seam metal roof, covered lanai with stone "
        "fireplace, mature live oaks, limestone driveway, native Texas "
        "landscaping with agave and oak."
    ),
    "L002": (
        "A restored 1948 Texas craftsman bungalow in East Austin. Sage-green "
        "clapboard siding with white trim, deep wraparound front porch with "
        "tapered wooden columns, exposed rafter tails, gabled roof, native "
        "xeriscape front yard with succulents and limestone, mature pecan "
        "tree casting dappled shade."
    ),
    "L003": (
        "A 1962 mid-century modern home in Zilker, Austin Texas. Vaulted "
        "tongue-and-groove wood ceilings visible through clerestory windows, "
        "post-and-beam construction, walls of glass, butterfly roofline, "
        "warm wood and limestone facade, mature pecan and cedar trees, "
        "minimalist front lawn with stepping stones."
    ),
    "L004": (
        "A modern three-story townhouse in Hyde Park, Austin Texas. White "
        "stucco facade with dark metal accents, narrow vertical windows, "
        "ground-level two-car garage, visible rooftop terrace pergola at the "
        "top, walkable urban neighborhood with sidewalks and small front "
        "trees, contemporary residential streetscape."
    ),
    "L005": (
        "A glass downtown high-rise residential tower in Austin Texas, viewed "
        "from a tree-lined street at golden hour. Floor-to-ceiling windows "
        "across the entire facade, slim metal mullions, warm reflections of "
        "the setting sun on the glass, urban streetscape with tall live oaks, "
        "modern luxury residential architecture."
    ),
    "L006": (
        "A stately Tarrytown estate in Austin Texas on a wooded acre. "
        "Limestone and cream stucco facade, slate roof, formal arched entry "
        "with iron lantern, paneled wood front door, mature live oaks framing "
        "the property, manicured emerald lawn, gas lamp posts lining a curved "
        "driveway, traditional luxury residential architecture."
    ),
    "L007": (
        "An industrial loft building exterior on South Lamar in Austin Texas. "
        "Exposed red brick and weathered steel facade, large factory-style "
        "multi-pane warehouse windows, converted warehouse aesthetic, ground "
        "floor cafe with bistro chairs at the corner, evening urban vibe, "
        "string lights overhead."
    ),
    "L008": (
        "A new-urbanist Craftsman-influenced home in Mueller, Austin Texas. "
        "Front porch with tapered wooden columns, mixed-material siding "
        "(board-and-batten plus cedar shingle gable), small tidy front yard "
        "with native plants, alley-loaded garage barely visible, walkable "
        "neighborhood with sidewalks, neighbor's matching house in soft focus."
    ),
    "L009": (
        "A 1950s Texas cottage in Barton Hills, Austin. Limestone front wall, "
        "pitched gable roof with weathered cedar shake shingles, screened "
        "side porch with wooden railing, native vegetation on a wooded lot "
        "with tall oaks and yaupon holly, dappled afternoon light filtering "
        "through the canopy."
    ),
    "L010": (
        "A modern penthouse atop a glass mid-rise residential building in "
        "Domain Northside Austin Texas. Visible 1200-square-foot private "
        "terrace with planters and outdoor furniture, floor-to-ceiling "
        "windows, sleek metal railings, urban skyline backdrop with mid-rise "
        "buildings, golden hour reflections, luxury contemporary architecture."
    ),
    "L011": (
        "A 1939 Texas bungalow in Travis Heights, Austin. Cream stucco walls "
        "with red clay tile roof accents, deep front porch with painted "
        "wooden columns and porch swing, terraced limestone retaining walls "
        "leading up from the sidewalk, mature crepe myrtle trees in bloom, "
        "vintage iron mailbox at the curb."
    ),
    "L012": (
        "A hilltop Westlake Austin Texas home with western lake views. Modern "
        "Hill Country architecture in limestone and dark metal, walls of "
        "glass overlooking Lake Austin in the distance, infinity pool visible "
        "in the foreground, mature live oaks framing the view, golden hour "
        "light raking across the facade, luxury contemporary residential."
    ),
}

# ---------------------------------------------------------------------------
# Models to try, in preference order. Imagen 4 → Imagen 3 → Nano Banana.
# Nano Banana works on free tier; Imagen typically needs paid.
# ---------------------------------------------------------------------------
MODELS = [
    ("imagen-4.0-generate-001", "imagen"),
    ("imagen-3.0-generate-002", "imagen"),
    ("gemini-2.5-flash-image-preview", "gemini"),
    ("gemini-2.0-flash-preview-image-generation", "gemini"),
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

    print(f"Generating {len(targets)} photo(s) into {PHOTOS_DIR}")
    print(f"Style: {STYLE[:80]}…")
    print()

    n_done = 0
    n_skip = 0
    n_fail = 0
    for lid in targets:
        out = PHOTOS_DIR / f"{lid}.png"
        if out.exists() and not args.force:
            print(f"  skip   {lid}  ({out.stat().st_size // 1024} KB exists)")
            n_skip += 1
            continue
        print(f"  → {lid}  generating…", end="", flush=True)
        try:
            img, model = generate_one(PROMPTS[lid], api_key, args.model)
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
