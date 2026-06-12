// Main-process integration of the rhetoric coach. Owns the engine instance,
// registers the coach IPC surface, and turns transcript chunks into gated
// nudges. LLM access is injected from gemini.js so this module stays free of
// provider specifics (and reusable for future non-Electron frontends).
const { ipcMain } = require('electron');
const { CoachEngine, parseCueResponse } = require('./engine');
const { CUE_TYPES } = require('./cues');
const { sanitizeBrief, serializeBrief, buildDecisionUserMessage, buildDebriefSystemPrompt, buildDebriefUserMessage } = require('./prompts');

const COACH_PROFILE = 'rhetoric_coach';

const engine = new CoachEngine();
let deps = {
    sendToRenderer: null,
    // async (systemPrompt, userMessage) => string
    complete: null,
    // (transcription, response) => void — persists a turn to session history
    saveTurn: null,
};
let isDeciding = false;
let ipcRegistered = false;

function initCoach(dependencies) {
    deps = { ...deps, ...dependencies };
    if (ipcRegistered) return;
    ipcRegistered = true;

    ipcMain.handle('coach-set-brief', async (event, rawBrief) => {
        try {
            const brief = sanitizeBrief(rawBrief);
            engine.reset(brief);
            // The serialized brief is returned so the renderer can pass it as
            // the session's custom prompt — single source of truth for the format.
            return { success: true, briefText: serializeBrief(brief) };
        } catch (error) {
            console.error('[Coach] Error setting brief:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('coach-generate-debrief', async () => {
        try {
            if (!deps.complete) {
                return { success: false, error: 'Coach not initialized' };
            }
            if (engine.getTranscriptText().trim() === '') {
                return { success: false, error: 'No conversation captured in this session' };
            }
            const markdown = await deps.complete(buildDebriefSystemPrompt(), buildDebriefUserMessage(engine));
            return { success: true, markdown };
        } catch (error) {
            console.error('[Coach] Error generating debrief:', error);
            return { success: false, error: error.message };
        }
    });
}

function isCoachProfile(profile) {
    return profile === COACH_PROFILE;
}

async function handleCoachTranscript(transcription, systemPrompt) {
    engine.recordTranscript(transcription);

    // Hard gates before spending a model call: rate limit window and no
    // concurrent decisions. Skipped text is not lost — it stays in the
    // rolling transcript window of the next call.
    if (engine.inCooldown() || isDeciding || !deps.complete) return;

    isDeciding = true;
    try {
        const raw = await deps.complete(systemPrompt, buildDecisionUserMessage(engine));
        const verdict = engine.gate(parseCueResponse(raw));
        if (!verdict.accepted) return;

        const entry = engine.accept(verdict.cue);
        const payload = { ...entry, icon: CUE_TYPES[entry.type].icon, label: CUE_TYPES[entry.type].label };

        if (deps.sendToRenderer) {
            deps.sendToRenderer('coach-nudge', payload);
        }
        if (deps.saveTurn) {
            deps.saveTurn(transcription, `${payload.icon} ${payload.text}`);
        }
    } catch (error) {
        console.error('[Coach] Decision error:', error);
    } finally {
        isDeciding = false;
    }
}

module.exports = {
    COACH_PROFILE,
    initCoach,
    isCoachProfile,
    handleCoachTranscript,
};
