# Context Coach — Rhetoric Coach Mode

This fork adds a real-time **rhetoric coach** to cheating-daddy: instead of
feeding you answers, it watches the conversation and gives rare, glanceable
nudges on *how* you communicate — status, defense against rhetorical attacks,
red thread, calibration, storytelling, focus, opportunities, and pauses.

Concept document (German): `KONZEPT.md` in the repo root (untracked, local).

## How it works

```
Mic + system audio ──► Gemini Live (transcription + diarization)
                              │ transcript chunks
                              ▼
                    src/coach (decision layer)
                    1. LLM proposes: cue or silence   (Groq, fallback Gemma)
                    2. CoachEngine gates in code:
                       - ≥ 25 s between nudges (12 s if urgent)
                       - same cue type suppressed for 60 s
                       - max 8 words per nudge
                              │ accepted nudges only
                              ▼
                    HUD (CoachLiveView) — nudge shows ~8 s, then disappears
```

Session flow: **Brief → Live → Debrief**

1. **Brief** (`CoachBriefView`): goal (required), counterpart, red thread,
   story beats, no-gos, your pattern under pressure. The coach measures the
   conversation against this brief, not against generic rhetoric rules.
2. **Live** (`CoachLiveView`): empty HUD with a listening indicator; nudges
   appear as icon + 3–7 words in the conversation's language.
3. **Debrief** (`CoachDebriefView`): goal check, strengths, exactly three
   learnings — generated from the full transcript when the session ends.

## Usage

1. Select the **Rhetoric Coach** profile under *AI Customization*.
2. Press *Start Session* — the brief form opens; fill the goal, hit
   *Start Coaching*.
3. Position the (always-on-top) window in a screen corner; `Cmd+M` makes it
   click-through, `Cmd+\` hides/shows it.
4. End the session with the back button — the debrief appears.

Requirements: BYOK Gemini API key (Groq key optional, lowers cue latency).
Audio mode is forced to *both* (mic + system audio) for coaching sessions —
the coach must hear both sides, e.g. a Teams call counterpart.

> **Note on consent:** capturing the counterpart's audio may require their
> consent depending on your jurisdiction. That responsibility is yours.

## Code layout

| Path | Role |
| --- | --- |
| `src/coach/cues.js` | Cue taxonomy (8 types, icons, model guidance) |
| `src/coach/engine.js` | Gating: rate limits, validation, transcript/nudge history |
| `src/coach/prompts.js` | Brief serialization, decision message, debrief prompts |
| `src/coach/index.js` | Main-process wiring: IPC (`coach-set-brief`, `coach-generate-debrief`), decision loop |
| `src/utils/prompts.js` | `rhetoric_coach` profile (system prompt, JSON-only output) |
| `src/utils/gemini.js` | Transcript routing for the coach profile + `coachComplete()` |
| `src/components/views/Coach*.js` | Brief form, live HUD, debrief view |

The `src/coach` module is deliberately self-contained (LLM access is
injected) so it can later back a mobile/iPhone frontend, and so the profile +
nudge display can be extracted as upstream PRs.
