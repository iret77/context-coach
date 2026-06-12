import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

// Live HUD for the rhetoric coach. Empty (just a subtle listening indicator)
// until a nudge arrives; the nudge is shown for a few seconds and disappears.
// All gating happens in the main process — this view renders whatever it gets.
const NUDGE_VISIBLE_MS = 8000;
const NUDGE_VISIBLE_URGENT_MS = 12000;

export class CoachLiveView extends LitElement {
    static styles = css`
        :host {
            display: flex;
            flex: 1;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: var(--space-md);
        }

        .idle {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            color: var(--text-muted);
            font-size: var(--font-size-xs);
        }

        .idle-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--success);
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%,
            100% {
                opacity: 0.4;
            }
            50% {
                opacity: 1;
            }
        }

        .nudge {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            padding: var(--space-md) var(--space-lg);
            background: var(--bg-elevated);
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-lg);
            animation: nudge-in 200ms ease;
            max-width: 100%;
        }

        .nudge.high {
            border-color: var(--danger);
        }

        @keyframes nudge-in {
            from {
                opacity: 0;
                transform: translateY(8px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .nudge-icon {
            font-size: 28px;
            line-height: 1;
            flex-shrink: 0;
        }

        .nudge-body {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .nudge-label {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .nudge-text {
            font-size: var(--font-size-lg);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            line-height: 1.3;
        }
    `;

    static properties = {
        _nudge: { state: true },
        _visible: { state: true },
        _count: { state: true },
    };

    constructor() {
        super();
        this._nudge = null;
        this._visible = false;
        this._count = 0;
        this._hideTimeout = null;
        this._onNudge = (_, nudge) => this._showNudge(nudge);
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('coach-nudge', this._onNudge);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._hideTimeout) clearTimeout(this._hideTimeout);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('coach-nudge', this._onNudge);
        }
    }

    _showNudge(nudge) {
        this._nudge = nudge;
        this._visible = true;
        this._count += 1;

        if (this._hideTimeout) clearTimeout(this._hideTimeout);
        const visibleMs = nudge.urgency === 'high' ? NUDGE_VISIBLE_URGENT_MS : NUDGE_VISIBLE_MS;
        this._hideTimeout = setTimeout(() => {
            this._visible = false;
        }, visibleMs);
    }

    render() {
        if (this._visible && this._nudge) {
            return html`
                <div class="nudge ${this._nudge.urgency === 'high' ? 'high' : ''}">
                    <div class="nudge-icon">${this._nudge.icon}</div>
                    <div class="nudge-body">
                        <div class="nudge-label">${this._nudge.label}</div>
                        <div class="nudge-text">${this._nudge.text}</div>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="idle">
                <div class="idle-dot"></div>
                <span>Coach listening${this._count > 0 ? ` · ${this._count} nudge${this._count === 1 ? '' : 's'}` : ''}</span>
            </div>
        `;
    }
}

customElements.define('coach-live-view', CoachLiveView);
