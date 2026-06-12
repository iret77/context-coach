import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

// Post-session debrief for the rhetoric coach: requests the markdown debrief
// from the main process (which holds transcript + nudge history) and renders
// it. Shown automatically when a coaching session ends.
export class CoachDebriefView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                height: 100%;
                overflow-y: auto;
            }

            .debrief-content {
                font-size: var(--font-size-base);
                line-height: var(--line-height);
                color: var(--text-primary);
                user-select: text;
                cursor: text;
            }

            .debrief-content h2 {
                font-size: var(--font-size-lg);
                font-weight: var(--font-weight-semibold);
                margin: var(--space-md) 0 var(--space-xs) 0;
            }

            .debrief-content ul {
                padding-left: var(--space-lg);
                margin: var(--space-xs) 0;
            }

            .debrief-content li {
                margin-bottom: var(--space-xs);
            }

            .state {
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
                padding: var(--space-lg) 0;
            }

            .state.error {
                color: var(--danger);
            }

            .actions {
                margin-top: var(--space-lg);
            }

            .done-btn {
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

            .done-btn:hover {
                background: var(--start-button-hover-background);
            }
        `,
    ];

    static properties = {
        onDone: { type: Function },
        _loading: { state: true },
        _markdown: { state: true },
        _error: { state: true },
    };

    constructor() {
        super();
        this.onDone = () => {};
        this._loading = true;
        this._markdown = '';
        this._error = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this._generateDebrief();
    }

    async _generateDebrief() {
        this._loading = true;
        this._error = '';
        try {
            const { ipcRenderer } = window.require('electron');
            const result = await ipcRenderer.invoke('coach-generate-debrief');
            if (result.success) {
                this._markdown = result.markdown;
            } else {
                this._error = result.error || 'Debrief generation failed';
            }
        } catch (error) {
            this._error = error.message;
        }
        this._loading = false;
    }

    _renderMarkdown() {
        if (typeof window !== 'undefined' && window.marked) {
            try {
                const container = document.createElement('div');
                container.innerHTML = window.marked.parse(this._markdown);
                return html`<div class="debrief-content">${container}</div>`;
            } catch (error) {
                console.error('Error rendering debrief markdown:', error);
            }
        }
        return html`<div class="debrief-content"><pre>${this._markdown}</pre></div>`;
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">Debrief</div>
                    </div>

                    <section class="surface">
                        ${this._loading
                            ? html`<div class="state">Analyzing the conversation…</div>`
                            : this._error
                              ? html`<div class="state error">${this._error}</div>`
                              : this._renderMarkdown()}

                        <div class="actions">
                            <button class="done-btn" @click=${() => this.onDone()}>Done</button>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('coach-debrief-view', CoachDebriefView);
