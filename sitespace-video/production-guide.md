# SiteSpace Pitch Video — Production Guide

Total runtime: ~2:50

---

## Scene 1 — Cold Open (0:00–0:15, 15s)

**Visual source:** Pexels stock — search these queries, download best 4–5 clips:

- "construction site worker phone frustrated"
- "site manager hard hat walkie talkie"
- "construction worker clipboard"
- "tower crane construction site busy"
- "excavation site workers"

**Edit:** Rapid cuts 1–1.5s each. Apply slight film grain + desaturation in CapCut.
**On-screen text:** At 0:11 → lower third: "The hidden cost of asset chaos" (white sans-serif, bottom left)
**SFX:** Site ambience underneath (Pixabay: "construction site ambience")

---

## Scene 2 — Centralised Booking (0:15–0:45, 30s)

**Visual source:** YOUR SCREENSHOT (dashboard home) + screen recording

**What to record (Screen Studio):**

1. Open SiteSpace dashboard → slow cursor move to "Add Asset" (3s)
2. Type "Tower Crane TC-01" into the modal (3s)
3. Navigate to invite subcontractor panel (3s)
4. Switch to the Bookings calendar view — show a week filled with coloured blocks (5s)

**Edit:** Start with the static dashboard screenshot (slow Ken Burns zoom in, 3s), then cut to screen recording.
**On-screen text:** Floating callouts that appear/fade: "Add asset" → "Book in seconds" → "One tap approval"
**SFX:** Soft UI tap sounds (ElevenLabs has a free SFX library, or Mixkit.co)

---

## Scene 3 — Site Profiles & Access (0:45–1:00, 15s)

**Visual source:** Pexels stock + AI still

**Pexels search:**

- "security gate boom barrier construction"
- "QR code scanning tablet site entry"
- "worker ID badge verification"

**AI still (generate with Flux via Replicate):**
Prompt: "A professional subcontractor profile card UI with name, photo, and credential badges including white card, EWP licence, and public liability insurance. Teal and dark navy SaaS design. Clean minimal interface. 16:9."

**On-screen text:** "Verified. Compliant. On site."

---

## Scene 4 — The Planning Problem (1:00–1:15, 15s)

**Visual source:** YOUR SCREENSHOT (Gantt chart) + YOUR SCREENSHOT (Capacity Planning with red 123% crane overload)

**Edit:**

1. Open with Gantt chart screenshot — slow horizontal pan right across the chart (5s)
2. Hard cut to Capacity Planning screenshot — punch in on the "123% OVER" crane row (5s)
3. Quick cut to site manager reaction (Pexels: "architect stressed screen")

**On-screen text:** At 1:09 → "5 planned. 2 available." in red, centre frame, 2s

**Note:** The Capacity Planning screenshot already shows the exact story — Crane at 123% utilisation with "1 over" badge. This is perfect. Use it directly.

---

## Scene 5 — AI Look-Ahead Planning (1:15–1:45, 30s)

**Visual source:** YOUR SCREENSHOT (Capacity Planning dashboard)

**Edit sequence:**

1. Capacity Planning dashboard — slow zoom into the header stats (Total Demand: 1109.5h, Capacity: 240h) — 5s
2. Pan down to the asset rows showing orange warning triangles — 5s
3. Zoom into "Concrete Pump" row showing "No capacity" across weeks 2–4 — 5s
4. Zoom out to show full dashboard — manager clicks "4W" toggle (if you can record this) — 5s
5. Final frame: the whole capacity view, clean — 10s

**On-screen text:** "Weeks ahead. Not days behind." (appears at 1:40, holds 5s)

**Note:** The capacity planning screenshot is your best asset. It shows exactly what the script describes — demand vs capacity gaps, week-by-week. Let it breathe.

---

## Scene 6 — Built Around Your Project (1:45–2:05, 20s)

**Visual source:** Pexels stock + your dashboard screenshot repeated with different crops

**Pexels search:**

- "construction office site manager laptop"
- "civil engineering infrastructure project"
- "mining construction site aerial"

**Edit:** Split-screen 3-panel layout — crop your dashboard screenshot 3 times at different zoom levels, apply slight colour tint to each (warm/cool/neutral) to suggest different project contexts. Pan across all three.

**On-screen text:** "Configured for your site. Configured for your team."

---

## Scene 7 — AI Gets Smarter (2:05–2:30, 25s)

**Visual source:** AI generated abstract + Pexels real-world

**AI still (Flux prompt):**
"Abstract network graph visualization with glowing nodes and connecting lines on dark navy background. Data flow aesthetic. Central node labelled AI with satellite project nodes. Teal accent colour. 16:9 cinematic."

**Pexels search (real-world montage):**

- "construction site sunset golden hour organised"
- "site manager smiling laptop success"
- "construction crew working efficiently"

**Edit:** 3s on the AI abstract still (slow zoom), then 4–5 quick real-world cuts (2s each).

---

## Scene 8 — CTA End Card (2:30–2:50, 20s)

**Visual source:** YOUR LOGO (PNG) + Pexels aerial

**Pexels search:**

- "construction site aerial golden hour"
- "tower crane sunset coordinated"

**Edit:**

1. Aerial stock clip — 5s slow drift
2. Dissolve to dark navy background (#0D1F2D)
3. Fade in Sitespace PNG logo — centred
4. Below logo: "Asset booking. Site access. AI planning." (white, light weight)
5. Below that: "sitespace.com.au" (teal, #00C5B5 or similar)
6. Teal "Book a 15-min demo" button shape — static, holds 5s

**Note:** Export the end card as a static Figma/Canva frame at 1920×1080 and import as a clip. Easier than animating in the video editor.

---

## Pexels Bulk Download List

Open pexels.com/videos and search each query. Download the HD version.

```
construction site worker phone frustrated
site manager hard hat hard hat rubbing temples
tower crane construction site
construction clipboard site foreman
boom gate security barrier construction
QR code scanning tablet entry
construction site golden hour aerial
site manager laptop smiling success
civil engineering project manager
construction workers efficient morning
architect stressed computer screen
```

---

## ElevenLabs Settings

Voice: **Daniel** (Australian accent) — requires Creator plan ($22/mo) or higher

- Stability: 0.45
- Similarity boost: 0.75
- Style: 0.20
- Speed: 0.88 (gives ~110–115 wpm from normal pace)

Paste the full `voiceover-elevenlabs.txt` file as one generation.
The "..." pauses become natural 0.8–1s gaps.

If you don't have the Daniel voice, use **George** (also UK/AU adjacent) or upload a 30-second sample of a voice you want cloned (ElevenLabs Professional Voice Clone, $99/mo plan).

---

## Final Edit Sequence (CapCut Pro)

1. Import all clips + voiceover MP3
2. Drop voiceover on track 1 — it's your locked timeline
3. Place video clips on track 2, trim to match voiceover beats
4. Add text overlays per scene (white Inter/Geist, scene-specific sizing)
5. Add SFX on track 3 (Mixkit.co — free, no attribution needed)
6. Add music on track 4 — fade in at 0:00, reduce 12dB under VO, fade out at 2:48
7. Colour grade: slight desaturation (-10) + warm lift (+5 red) on real-world scenes. Clean/neutral on product scenes.
8. Export: MP4, H.264, 1920×1080, 30fps, High bitrate

Estimated editing time: 4–6 hours for a first cut.
