# Dropping In Real 3D Assets

This game ships with placeholder/procedural 3D art (simple primitives built directly in
JavaScript) for Matt and all 37 objects. Every one of them can be individually upgraded to a
real model by dropping a file in the right place — **no code changes required**. This document
is the complete reference for doing that: what file type, what filename, what naming
requirements apply, and how to use Blender + Claude (via the Blender MCP server) to build the
files.

If you're picking this project back up later, this file plus `content/objects.json` is
everything you need — you shouldn't have to go spelunking in the source to remember the rules.

---

## How the drop-in system works (all assets)

- **File format:** `.glb` (binary glTF) — a single self-contained file with meshes, materials,
  and textures all embedded. Don't use `.gltf` (the multi-file/JSON variant) — the loader is
  configured for `.glb` only.
- **Location:** everything lives in `assets/models/`, one file per thing:
  - Matt: `assets/models/matt.glb`
  - Every other object: `assets/models/<object-id>.glb` (see the table below for exact ids)
- **It's fully automatic.** The game probes for these files once at startup (during the
  "Finding Matt..." loading screen). If a file exists and loads successfully, it's used instead
  of the placeholder, everywhere, immediately — no registration, no manifest, no content-JSON
  edit. If a file is missing, that object just keeps using its placeholder. You can upgrade
  objects one at a time, in any order, and leave the rest as placeholders indefinitely.
- **Scale and position are auto-corrected for ordinary objects** (not Matt — see below): the
  code measures the placeholder's real-world size, then rescales whatever `.glb` you drop in to
  match, and re-centers/re-grounds it so its base sits at the object's origin. This means you
  don't have to hand-tune export scale or pivot for the 37 objects — just build them at a
  reasonable relative size and orientation and the game will fit them in.
- **After dropping a file in**, reload the page and open the browser console. You'll see either:
  - `[wim] loaded custom model for "<id>"` — success.
  - `[wim] matt.glb is missing a required "Head"/"LeftEye"/"RightEye" named object -- falling
    back to the placeholder Matt.` (Matt only — see below) — the file loaded but a required part
    was missing or misnamed.
  - Nothing at all — the file wasn't found (check the filename/path) or failed to parse.

Relevant source files, if you need to go deeper:
- `src/matt/buildMatt.js` — Matt's loader + rig wiring
- `src/objects/registry.js` — every other object's loader + auto-fit logic
- `content/objects.json` — the canonical id/displayName/size list

---

## Matt — full rig requirements

Matt is the one asset with real requirements beyond "looks right," because his eyes, head, and
shirt logo all move independently every round — that's the entire joke of the game. The model
must be built as a **rigid hierarchy** (empties/meshes parented to each other and rotated as
whole objects), **not a soft-skinned/deformed mesh** — nothing in this codebase does skeletal
blending, it just rotates named nodes directly. This is simpler to build anyway.

**File:** `assets/models/matt.glb`

**Required named objects** (case-sensitive — must match exactly):

| Name | Required? | What it does |
|---|---|---|
| `Head` | **Required** | Rotates to aim Matt's head at a target each round. If missing, the whole model is rejected and the game falls back to the placeholder Matt. |
| `LeftEye` | **Required** | Rotates independently of `RightEye` — this is the central joke (his eyes can point at two different objects). |
| `RightEye` | **Required** | Rotates independently of `LeftEye`. |
| `ShirtLogoNotch` | Optional but important | The small rotating part of the shirt emblem — **this is the secret "Ramage Compass"**. It subtly and continuously rotates toward whatever object the compass is secretly pointing at each round. If omitted, the game still works but the hidden clue mechanic has nothing to visually render. |
| `Sunglasses` | Optional | A mesh that gets toggled visible/invisible for the rare "Sunglasses Mode" special event (hides his eyes). If omitted, that event just skips the visual (still works narratively via text). |

**Hierarchy notes:**
- `LeftEye` / `RightEye` should be children of `Head` (so they inherit head rotation and only
  need to additionally aim within that), but this isn't strictly enforced by code — any parent
  chain works as long as the names resolve via `scene.getObjectByName(...)`.
- `ShirtLogoNotch` should be a small distinct sub-mesh of the shirt logo/emblem — a wedge, a
  piece of lettering, a notch, whatever reads as "part of the logo design" rather than an
  obvious arrow. The rotation is intentionally subtle (blended ~25% toward the true direction,
  not a literal pointer) — see `src/matt/logo.js` `updateLogoNotch()` if you want to tune that.

**Orientation & scale (NOT auto-corrected for Matt — get this right on export):**
- Real-world scale, in meters (a standing adult, ~1.7–1.9m tall).
- Standing upright, **feet at the model's own local origin** (y = 0), facing **+Z**.
- Unlike ordinary objects, Matt's placement math assumes his root origin is at his feet — if the
  file's origin is somewhere else (e.g. center of mass), he'll appear to float or sink into the
  ground, and the default camera framing (tuned for a feet-at-origin rig) may frame him
  incorrectly.

**What happens if you get it wrong:** the loader is defensive — if `Head`/`LeftEye`/`RightEye`
aren't found, it logs a warning and falls back to the placeholder rather than crashing. Scale/
pivot mistakes won't crash anything either, but Matt may appear at the wrong size or floating/
sunk relative to the ground and other objects.

---

## All other objects

No named sub-parts, no rigging, no rest-pose requirements — these are static props. The only
thing that matters is that the model is oriented upright and roughly proportioned; scale and
grounding are corrected automatically at load time.

| Object ID | File to drop in | Display name | Approx. size (m) | Notes |
|---|---|---|---|---|
| `beer` | `assets/models/beer.glb` | Beer | 0.15 | duplicates up to 8x in "Too Many Of Them" |
| `brat` | `assets/models/brat.glb` | Bratwurst | 0.18 | |
| `cheese-curds` | `assets/models/cheese-curds.glb` | Cheese Curds | 0.10 | |
| `football` | `assets/models/football.glb` | Football | 0.28 | |
| `pigeon` | `assets/models/pigeon.glb` | Pigeon | 0.30 | also used (scaled up) for the "Giant Pigeon" special event |
| `porta-potty` | `assets/models/porta-potty.glb` | Porta-Potty | 2.30 | large fixture, never duplicates |
| `cooler` | `assets/models/cooler.glb` | Cooler | 0.50 | forced answer during "Beer Emergency" event |
| `lawn-chair` | `assets/models/lawn-chair.glb` | Lawn Chair | 0.85 | |
| `grill` | `assets/models/grill.glb` | Grill | 1.00 | |
| `foam-finger` | `assets/models/foam-finger.glb` | Foam Finger | 0.60 | |
| `cheesehead` | `assets/models/cheesehead.glb` | Cheesehead | 0.35 | |
| `nachos` | `assets/models/nachos.glb` | Nachos | 0.12 | |
| `giant-pretzel` | `assets/models/giant-pretzel.glb` | Giant Pretzel | 0.55 | |
| `parking-cone` | `assets/models/parking-cone.glb` | Parking Cone | 0.45 | |
| `tv-football` | `assets/models/tv-football.glb` | TV Showing Football | 0.70 | |
| `empty-beer-case` | `assets/models/empty-beer-case.glb` | Empty Beer Case | 0.30 | |
| `rival-fan` | `assets/models/rival-fan.glb` | Rival Fan | 1.75 | a person, but not a Matt variant — no named parts needed, doesn't move |
| `hot-dog` | `assets/models/hot-dog.glb` | Hot Dog | 0.15 | |
| `sunglasses` | `assets/models/sunglasses.glb` | Sunglasses | 0.05 | this is the *prop* object, unrelated to Matt's own `Sunglasses` mesh |
| `microphone` | `assets/models/microphone.glb` | Microphone | 0.25 | |
| `tailgate-table` | `assets/models/tailgate-table.glb` | Tailgate Table | 0.75 | |
| `cardboard-box` | `assets/models/cardboard-box.glb` | Mysterious Cardboard Box | 0.45 | |
| `trophy` | `assets/models/trophy.glb` | Trophy | 0.40 | |
| `inflatable-football` | `assets/models/inflatable-football.glb` | Inflatable Football | 0.90 | |
| `another-matt` | *(none — see below)* | Another Matt | 1.80 | **do not drop a file here** |
| `tiny-matt` | *(none — see below)* | Tiny Matt | 0.30 | **do not drop a file here** |
| `random-sock` | `assets/models/random-sock.glb` | Random Sock | 0.10 | |
| `pizza` | `assets/models/pizza.glb` | Pizza | 0.35 | |
| `chicken-wings` | `assets/models/chicken-wings.glb` | Chicken Wings | 0.15 | |
| `mustard-bottle` | `assets/models/mustard-bottle.glb` | Mustard Bottle | 0.22 | |
| `grill-tongs` | `assets/models/grill-tongs.glb` | Grill Tongs | 0.35 | |
| `folding-chair` | `assets/models/folding-chair.glb` | Folding Chair | 0.90 | |
| `megaphone` | `assets/models/megaphone.glb` | Megaphone | 0.40 | |
| `garbage-can` | `assets/models/garbage-can.glb` | Garbage Can | 0.90 | |
| `cornhole-bag` | `assets/models/cornhole-bag.glb` | Cornhole Bag | 0.15 | |
| `suspicious-cooler` | `assets/models/suspicious-cooler.glb` | Suspicious Cooler | 0.55 | |
| `nothing` | *(none — never has a model)* | Nothing | — | sentinel for the "Nothing" special event; renders as a floating text label, not a mesh |

**Special cases:**
- **`another-matt` and `tiny-matt`** automatically use `matt.glb` (see above) — they spawn a
  second full copy of Matt's rig, just scaled down for `tiny-matt`. Upgrading Matt upgrades
  these two for free; there's nothing separate to drop in for them.
- **`nothing`** is not a placeable prop — it's a floating "NOTHING" text label used by one
  special event. No model applies.

---

## Building the files with Claude + the Blender MCP server

Blender now has an official MCP (Model Context Protocol) integration
([blender.org/lab/mcp-server](https://www.blender.org/lab/mcp-server/)) that lets an MCP-capable
AI assistant — including Claude — connect to a live Blender session and drive it directly:
create/modify objects, apply materials, inspect the scene graph, and run arbitrary `bpy` Python.
This is a good fit for this task specifically because the requirements above (exact object
names, hierarchy, export settings) are mechanical and easy to state precisely in a prompt.

**Setup (one-time):**
1. Install **Blender 5.1+**.
2. Install the Blender MCP add-on (drag-and-drop installer or manual ZIP — see the link above).
3. Install/connect the MCP server to your Claude client per that add-on's instructions. (There's
   also a longstanding community project, [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp),
   if you hit friction with the official one.)
4. **Security note:** the MCP server executes AI-generated code inside Blender with no
   sandboxing — Blender's own docs recommend running it without access to sensitive files/
   credentials on that machine. Treat it like giving a script full run of your Blender session,
   because that's exactly what it is.

**Suggested workflow once connected, per asset:**
- For **Matt**: give Claude the "Matt — full rig requirements" section above verbatim as context
  (names, hierarchy, orientation, scale), plus your reference photos, and ask it to build/rig
  the model in the live Blender session, create the four named empties/objects in the right
  places, parent the eyes under the head, and export to `C:\Code\MRVision\assets\models\matt.glb`
  as glTF Binary (`.glb`).
- For **ordinary objects**: point Claude at the row of the table above for that object (id,
  approximate size) and ask it to model/rig-free-build it and export to
  `C:\Code\MRVision\assets\models\<id>.glb`. No named parts needed, so these are much faster —
  good candidates to batch through several in one session.
- After each export, reload the game locally and check the browser console for the
  `[wim] loaded custom model for "<id>"` line to confirm it picked up correctly.
