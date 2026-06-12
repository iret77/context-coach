// CoachEngine — the discipline layer of the rhetoric coach.
//
// The LLM proposes cues; this engine decides whether they actually reach the
// user. Rate limiting lives here in code, not in the prompt, so a chatty model
// can never flood the HUD. The engine also keeps the session transcript and
// nudge history for the debrief.
const { CUE_TYPES } = require('./cues');

const DEFAULT_OPTIONS = {
    // Hard minimum between two nudges shown to the user.
    minNudgeIntervalMs: 25000,
    // High-urgency cues (e.g. status loss in progress) may come sooner.
    urgentNudgeIntervalMs: 12000,
    // The same cue type is suppressed for this long unless urgent.
    sameTypeCooldownMs: 60000,
    // Cue texts longer than this are rejected — a nudge must be glanceable.
    maxTextWords: 8,
    // How much trailing transcript is sent to the decision model per call.
    transcriptWindowChars: 8000,
};

class CoachEngine {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.reset(null);
    }

    reset(brief) {
        this.brief = brief || null;
        this.transcriptChunks = [];
        this.nudges = [];
        this.lastNudgeAt = 0;
        this.lastNudgeAtByType = {};
        this.sessionStartedAt = Date.now();
    }

    recordTranscript(text) {
        const trimmed = (text || '').trim();
        if (trimmed === '') return;
        this.transcriptChunks.push({ ts: Date.now(), text: trimmed });
    }

    getTranscriptText() {
        return this.transcriptChunks.map(chunk => chunk.text).join('\n');
    }

    getTranscriptWindow() {
        const full = this.getTranscriptText();
        const max = this.options.transcriptWindowChars;
        return full.length > max ? full.slice(-max) : full;
    }

    getRecentNudges(limit = 5) {
        return this.nudges.slice(-limit);
    }

    inCooldown(now = Date.now()) {
        // Pre-gate used to skip decision calls entirely while the hard rate
        // limit holds. Urgent cues can still fire after urgentNudgeIntervalMs,
        // so cooldown only applies below that threshold.
        return now - this.lastNudgeAt < this.options.urgentNudgeIntervalMs;
    }

    normalizeCue(cue) {
        if (!cue || typeof cue !== 'object') return null;
        const type = typeof cue.type === 'string' ? cue.type.trim().toLowerCase() : '';
        if (!CUE_TYPES[type]) return null;
        const text = typeof cue.text === 'string' ? cue.text.replace(/\s+/g, ' ').trim() : '';
        if (text === '') return null;
        if (text.split(' ').length > this.options.maxTextWords) return null;
        const urgency = cue.urgency === 'high' ? 'high' : 'normal';
        return { type, text, urgency };
    }

    gate(cue, now = Date.now()) {
        const normalized = this.normalizeCue(cue);
        if (!normalized) {
            return { accepted: false, reason: cue ? 'invalid-cue' : 'silence' };
        }

        const interval = normalized.urgency === 'high' ? this.options.urgentNudgeIntervalMs : this.options.minNudgeIntervalMs;
        if (now - this.lastNudgeAt < interval) {
            return { accepted: false, reason: 'rate-limit' };
        }

        const lastOfType = this.lastNudgeAtByType[normalized.type] || 0;
        if (normalized.urgency !== 'high' && now - lastOfType < this.options.sameTypeCooldownMs) {
            return { accepted: false, reason: 'type-cooldown' };
        }

        return { accepted: true, cue: normalized };
    }

    accept(cue, now = Date.now()) {
        const entry = { ...cue, ts: now };
        this.nudges.push(entry);
        this.lastNudgeAt = now;
        this.lastNudgeAtByType[cue.type] = now;
        return entry;
    }
}

// Extracts the cue decision from a raw model response. Tolerates markdown
// fences and surrounding prose; returns null (= stay silent) when nothing
// parseable is found, so a malformed response can never produce a nudge.
function parseCueResponse(raw) {
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    let text = raw.replace(/```(?:json)?/gi, '').trim();

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed.cue || null;
    } catch (error) {
        return null;
    }
}

module.exports = { CoachEngine, parseCueResponse, DEFAULT_OPTIONS };
