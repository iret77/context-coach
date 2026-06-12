// Cue taxonomy for the rhetoric coach profile. Every nudge the coach emits
// must reference exactly one of these types; anything else is rejected by the
// engine before it reaches the UI.
const CUE_TYPES = {
    status: {
        icon: '👑',
        label: 'Status',
        guidance: 'The user is losing conversational status: over-justifying, apologizing without need, accepting being talked down to.',
    },
    defense: {
        icon: '🛡️',
        label: 'Defense',
        guidance: 'The user is under a rhetorical attack (loaded question, frame trap, ad hominem) and needs a counter move now.',
    },
    thread: {
        icon: '🧭',
        label: 'Thread',
        guidance: 'The conversation drifted away from the planned key points; steer back to the next point of the red thread.',
    },
    calibration: {
        icon: '🎚️',
        label: 'Calibration',
        guidance: 'Tone or energy is off: too aggressive, too passive, too fast, escalating, or fading presence.',
    },
    drama: {
        icon: '📖',
        label: 'Storytelling',
        guidance: 'Now is the moment for a prepared story, example, or dramaturgic beat — or the user is killing a story by over-explaining.',
    },
    focus: {
        icon: '🎯',
        label: 'Focus',
        guidance: 'The user is rambling, derailing into side topics, or burying the goal of the conversation.',
    },
    chance: {
        icon: '⚡',
        label: 'Opportunity',
        guidance: 'A window just opened: agreement signals, momentum, a concession — push for the goal or the close now.',
    },
    pause: {
        icon: '🤫',
        label: 'Pause',
        guidance: 'Silence is the strongest move right now: let an offer sit, let the counterpart fill the gap, do not backpedal.',
    },
};

const CUE_TYPE_IDS = Object.keys(CUE_TYPES);

module.exports = { CUE_TYPES, CUE_TYPE_IDS };
