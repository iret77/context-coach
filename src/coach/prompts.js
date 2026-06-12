// Prompt builders for the rhetoric coach: brief serialization, the per-call
// decision message, and the post-session debrief. The profile system prompt
// itself lives in src/utils/prompts.js alongside the other profiles.
const { CUE_TYPES } = require('./cues');

const BRIEF_FIELDS = [
    { key: 'goal', label: 'Goal of this conversation' },
    { key: 'counterpart', label: 'Counterpart' },
    { key: 'redThread', label: 'Red thread (key points in order)' },
    { key: 'storyBeats', label: 'Prepared stories / script beats' },
    { key: 'noGos', label: 'No-gos' },
    { key: 'myPattern', label: 'Known weakness of the user under pressure' },
];

const BRIEF_FIELD_MAX_CHARS = 4000;

// Reduces an arbitrary IPC payload to the known brief shape with capped
// string fields — nothing else crosses into prompt construction.
function sanitizeBrief(raw) {
    const brief = {};
    if (!raw || typeof raw !== 'object') return brief;
    for (const field of BRIEF_FIELDS) {
        const value = raw[field.key];
        if (typeof value === 'string' && value.trim() !== '') {
            brief[field.key] = value.trim().slice(0, BRIEF_FIELD_MAX_CHARS);
        }
    }
    return brief;
}

function serializeBrief(brief) {
    const sanitized = sanitizeBrief(brief);
    const lines = [];
    for (const field of BRIEF_FIELDS) {
        if (sanitized[field.key]) {
            lines.push(`${field.label}:\n${sanitized[field.key]}`);
        }
    }
    return lines.join('\n\n');
}

function buildCueCatalog() {
    return Object.entries(CUE_TYPES)
        .map(([id, def]) => `- "${id}" (${def.label}): ${def.guidance}`)
        .join('\n');
}

// The user message for one decision call: rolling transcript window plus the
// nudges already given, so the model neither repeats itself nor re-litigates.
function buildDecisionUserMessage(engine) {
    const transcriptWindow = engine.getTranscriptWindow();
    const recentNudges = engine.getRecentNudges();

    const nudgeLines = recentNudges.length > 0 ? recentNudges.map(n => `- [${n.type}] "${n.text}"`).join('\n') : '(none yet)';

    return [
        'Live transcript (most recent part of the ongoing conversation):',
        '-----',
        transcriptWindow || '(no speech captured yet)',
        '-----',
        '',
        'Nudges already given to the user this session (do not repeat them):',
        nudgeLines,
        '',
        'Decide now: stay silent or give exactly one nudge. Respond with JSON only.',
    ].join('\n');
}

function buildDebriefSystemPrompt() {
    return [
        'You are a rhetoric coach writing a short post-conversation debrief for the person you coached.',
        'You will receive the coaching brief, the conversation transcript, and the live nudges that were shown during the conversation.',
        '',
        '**Write the debrief in the language predominantly spoken in the transcript.**',
        '',
        'Structure the debrief in markdown exactly like this:',
        '1. `## Ziel` / `## Goal` — one or two sentences: was the stated goal achieved, partially achieved, or missed? Base this only on the transcript.',
        '2. `## Stark` / `## Strengths` — 2-3 bullet points: moments where the user handled status, argumentation, or dramaturgy well. Quote short fragments where useful.',
        '3. `## Lernpunkte` / `## Learnings` — exactly 3 bullet points: the most important concrete improvements, each with a one-line practice suggestion.',
        '',
        'Stay concrete and reference actual moments from the transcript. No generic rhetoric advice. Keep the whole debrief under 250 words.',
    ].join('\n');
}

function buildDebriefUserMessage(engine) {
    const briefText = serializeBrief(engine.brief);
    const nudgeLines = engine.nudges.length > 0 ? engine.nudges.map(n => `- [${n.type}] "${n.text}"`).join('\n') : '(none)';

    return [
        'Coaching brief:',
        '-----',
        briefText || '(no brief provided)',
        '-----',
        '',
        'Live nudges shown during the conversation:',
        nudgeLines,
        '',
        'Full transcript:',
        '-----',
        engine.getTranscriptText() || '(empty)',
        '-----',
        '',
        'Write the debrief now.',
    ].join('\n');
}

module.exports = {
    BRIEF_FIELDS,
    sanitizeBrief,
    serializeBrief,
    buildCueCatalog,
    buildDecisionUserMessage,
    buildDebriefSystemPrompt,
    buildDebriefUserMessage,
};
