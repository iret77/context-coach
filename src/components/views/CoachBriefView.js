import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

// Pre-brief form for the rhetoric coach profile. Collected once before the
// session starts; the serialized brief becomes the 'User-provided context' of
// the coach system prompt and is sent to the main process for the debrief.
export class CoachBriefView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                height: 100%;
                overflow-y: auto;
            }

            .brief-grid {
                display: flex;
                flex-direction: column;
                gap: var(--space-md);
            }

            textarea.control {
                resize: vertical;
                min-height: 64px;
                font-family: var(--font);
            }

            .actions {
                display: flex;
                gap: var(--space-sm);
                margin-top: var(--space-lg);
            }

            .start-btn {
                background: var(--start-button-background);
                color: var(--start-button-color);
                border: 1px solid var(--start-button-border);
                border-radius: var(--radius-md);
                padding: var(--space-sm) var(--space-lg);
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-semibold);
                cursor: pointer;
                transition: background var(--transition);
            }

            .start-btn:hover {
                background: var(--start-button-hover-background);
            }

            .start-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .cancel-btn {
                background: transparent;
                color: var(--text-secondary);
                border: 1px solid var(--border-strong);
                border-radius: var(--radius-md);
                padding: var(--space-sm) var(--space-lg);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition: color var(--transition);
            }

            .cancel-btn:hover {
                color: var(--text-primary);
            }
        `,
    ];

    static properties = {
        onSubmit: { type: Function },
        onCancel: { type: Function },
        _brief: { state: true },
    };

    constructor() {
        super();
        this.onSubmit = () => {};
        this.onCancel = () => {};
        this._brief = {
            goal: '',
            counterpart: '',
            redThread: '',
            storyBeats: '',
            noGos: '',
            myPattern: '',
        };
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            if (prefs.coachBrief && typeof prefs.coachBrief === 'object') {
                this._brief = { ...this._brief, ...prefs.coachBrief };
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading coach brief:', error);
        }
    }

    _updateField(key, value) {
        this._brief = { ...this._brief, [key]: value };
    }

    async _handleStart() {
        if (this._brief.goal.trim() === '') return;
        try {
            await cheatingDaddy.storage.updatePreference('coachBrief', this._brief);
        } catch (error) {
            console.error('Error saving coach brief:', error);
        }
        this.onSubmit(this._brief);
    }

    render() {
        const fields = [
            { key: 'goal', label: 'Goal of this conversation *', type: 'input', placeholder: 'e.g. Get the Q3 budget approved' },
            { key: 'counterpart', label: 'Counterpart', type: 'input', placeholder: 'e.g. CFO, numbers-driven, tends to interrupt' },
            { key: 'redThread', label: 'Red thread (key points in order)', type: 'textarea', placeholder: 'One key point per line' },
            {
                key: 'storyBeats',
                label: 'Prepared stories / script beats',
                type: 'textarea',
                placeholder: 'Stories or script passages you want to land',
            },
            { key: 'noGos', label: 'No-gos', type: 'textarea', placeholder: 'e.g. Do not justify, do not name the price first' },
            { key: 'myPattern', label: 'Your pattern under pressure', type: 'input', placeholder: 'e.g. I become too passive when challenged' },
        ];

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">Coaching Brief</div>
                    </div>

                    <section class="surface">
                        <div class="brief-grid">
                            ${fields.map(
                                field => html`
                                    <div class="form-group">
                                        <label class="form-label">${field.label}</label>
                                        ${field.type === 'textarea'
                                            ? html`<textarea
                                                  class="control"
                                                  placeholder=${field.placeholder}
                                                  .value=${this._brief[field.key]}
                                                  @input=${e => this._updateField(field.key, e.target.value)}
                                              ></textarea>`
                                            : html`<input
                                                  class="control"
                                                  type="text"
                                                  placeholder=${field.placeholder}
                                                  .value=${this._brief[field.key]}
                                                  @input=${e => this._updateField(field.key, e.target.value)}
                                              />`}
                                    </div>
                                `
                            )}
                            <div class="form-help">The coach measures the conversation against this brief — only the goal is required.</div>
                        </div>

                        <div class="actions">
                            <button class="start-btn" ?disabled=${this._brief.goal.trim() === ''} @click=${() => this._handleStart()}>
                                Start Coaching
                            </button>
                            <button class="cancel-btn" @click=${() => this.onCancel()}>Back</button>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('coach-brief-view', CoachBriefView);
