# Kurumi expression atlas v2

Generated once with built-in image_gen using four reference images; no variants or retries.

File: `/tmp/kurumi-art/kurumi-expressions-v2.png`

Layout: four columns by two rows. Top row: calm, small pleased smile, excited fist, ecstatic victory. Bottom row: worried frown, shocked tiny pupils, hollow dazed panic, catastrophic crying with both hands holding head.

## Checks

PNG size: 1774 × 887 px, RGBA. Alpha range 0–255; actual background transparency is preserved. Top corner alpha is 0; bottom corner alpha is 2, so there is slight near-transparent generation noise.

The output has a 2:1 aspect ratio but dimensions are not divisible by four/two. Exact regular UV layout uses fractional cell size 443.5 × 443.5 px. Integer crop bounds: x = [0, 444, 887, 1330, 1774], y = [0, 444, 887].

Visual inspection confirms 8 distinct reactions, corrected white hair clip and white short-sleeve black-string-knot blouse, no headband/cardigan/tie, no extra character or text. Shock and hollow-eye reactions are sharply different from the ordinary faces. All figures stay in their visual cells, but the intended generous safe margin was not met: computer and desk meet some side/bottom edges, and the victory hands approach the top edge. Consumer should keep each crop within its cell and add layout padding when drawing on flip-card texture.

## Exact prompt

Use case: identity-preserve
Asset type: revised transparent 8-expression character sprite atlas for a 3D mechanical flip-page coin bank website.
Primary request: Redraw the existing fan-art atlas into ONE new wide 4-column by 2-row atlas, exactly eight equally sized square cells on a 2:1 canvas. Create original Kurumi fan art informed by the provided official references, not a cutout, tracing, screenshot reuse, cover recreation, or copy of a manga panel.
Input images and their roles:
Image 1, official volume 1 cover: Kurumi character identity, pink bob hairstyle, small white side hair clip, large round rose-pink eyes, white/light short-sleeve blouse with thin black ribbon knot at neckline. Ignore the other characters, cover pose, background, and typography.
Image 2, official volume 2 cover: Kurumi face and hairstyle reference only; use the same short pink bob and small round youthful face, not the cover lighting or pose.
Image 3, official manga press sample: reference only for the stronger ink-line language and drastic comedic panic reaction; DO NOT reuse its composition, panels, speech, numbers, or other printed elements.
Image 4, existing 2x2 fan-art atlas: composition/technical reference only: one upper-body character seated at a computer, monitor in lower-left. Correct its unsupported costume and expression softness: REMOVE black headband, beige cardigan, red necktie.
Subject invariants across all eight cells: same Fukuga Kurumi (FX戦士くるみちゃん), a young adult female manga character with a chin-length pastel-pink bob, distinctive separated long bangs, one small plain white hair clip on the visible side at viewer-right, very large round pink/rose eyes, compact round face, simple white/light short-sleeve blouse and thin black bow/string knot at neckline. Same body scale, eye level, seated upper-body viewpoint, three-quarter angle only slightly off frontal. Dark gray computer monitor at the lower-left of each cell, a minimal dark keyboard/desk edge at bottom. Face and upper body large and readable; monitor lower so it does not hide her expression.
Style: authentic comic character sheet feeling, clean but forceful dark ink outlines, mostly flat modest colors, a little manga halftone and compact shadow shapes, simple hair shading, fewer glossy highlights. Ordinary expressions should be simple and sincere; severe-loss expressions should be much more extreme. Do not make all eight faces soft pretty generic anime portraits.
Precise expressions in left-to-right reading order:
TOP ROW 1: calm intent stare at screen, mouth small neutral line, hands at keyboard.
TOP ROW 2: small smug pleased smile, half-raised eyebrows, hands at keyboard.
TOP ROW 3: excited, bright round eyes and big smile, one compact fist raised near chest, the other hand remains near keyboard.
TOP ROW 4: ecstatic victory, huge delighted grin, arms raised in celebration, expressive but still consistent face/body size.
BOTTOM ROW 1: anxious frown, drawn brows, tense little mouth, small panic sweat, hands near keyboard.
BOTTOM ROW 2: sudden shock, round eyes with tiny pupils, mouth wide open, shoulders tensed, one hand frozen raised.
BOTTOM ROW 3: dazed ruin, hollow unfocused tiny pupils, heavy shadow/halftone around eyes, multiple sweat beads, slack mouth, slumped shoulders.
BOTTOM ROW 4: comic catastrophic crying, BOTH hands gripping sides/top of own head, contorted distressed face, tiny pupils surrounded by watery eyes, streams of tears, open yelling mouth, strong manga exaggeration.
Composition/framing: exact four columns and two rows with no visible dividers. Each cell must contain exactly one Kurumi at the computer. Keep the character, hands, hair, computer, and any desk fragments entirely within their cell with a clear transparent safety margin on every side. No part may cross a cell boundary or touch an adjacent character. All eight images have nearly identical cropping and body proportions. Make head/face a large part of the illustration; only a little table is visible.
Background: actual fully transparent alpha canvas, including clear gaps and margin around each cell. No opaque backdrop, no checkerboard drawn into the image.
Avoid: any black headband, cardigan, red tie, extra characters, huge decorative hairstyles, wrong hair color, inappropriate outfit, photorealism, 3D render, cover layout, speech bubbles, text, letters, digits, captions, charts, candlesticks, icons, borders, grid lines, watermarks, logos.
