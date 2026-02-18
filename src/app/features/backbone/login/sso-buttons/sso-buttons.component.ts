import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';


export type SSOProvider =
  'google'
  | 'apple'
  | 'github'
  | 'facebook'
  | 'azure'
  | 'twitter';

/**
 * SSO Buttons Component
 *
 * Displays social login buttons for various OAuth providers.
 * Can be used in both login and signup flows.
 *
 * Usage:
 * ```html
 * <app-sso-buttons
 *   [providers]="['google', 'apple', 'github']"
 *   [mode]="'login'"
 *   (providerSelected)="handleSSOLogin($event)">
 * </app-sso-buttons>
 * ```
 */
@Component({
  selector: 'app-sso-buttons',
  template: `
    <div class="sso-buttons-container">
      <div class="divider" *ngIf="showDivider">
        <span>{{ dividerText }}</span>
      </div>
      
      <div class="buttons-grid">
        <button
          *ngFor="let provider of providers"
          mat-stroked-button
          class="sso-button"
          [class.google]="provider === 'google'"
          [class.apple]="provider === 'apple'"
          [class.github]="provider === 'github'"
          [class.facebook]="provider === 'facebook'"
          [class.azure]="provider === 'azure'"
          [class.twitter]="provider === 'twitter'"
          (click)="selectProvider(provider)"
          type="button"
        >
          <mat-icon [svgIcon]="getProviderIcon(provider)" class="provider-icon"></mat-icon>
          <span>{{ getButtonText(provider) }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
      .sso-buttons-container {
          width: 100%;
      }

      .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 20px 0;
      }

      .divider::before,
      .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #ddd;
      }

      .divider span {
          padding: 0 10px;
          color: #666;
          font-size: 14px;
      }

      .buttons-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
      }

      .sso-button {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
      }

      .sso-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .provider-icon {
          width: 20px;
          height: 20px;
      }

      /* Provider-specific styles */
      .sso-button.google {
          border-color: #4285f4;
          color: #4285f4;
      }

      .sso-button.google:hover {
          background-color: rgba(66, 133, 244, 0.05);
      }

      .sso-button.apple {
          border-color: #000;
          color: #000;
      }

      .sso-button.apple:hover {
          background-color: rgba(0, 0, 0, 0.05);
      }

      .sso-button.github {
          border-color: #24292e;
          color: #24292e;
      }

      .sso-button.github:hover {
          background-color: rgba(36, 41, 46, 0.05);
      }

      .sso-button.facebook {
          border-color: #1877f2;
          color: #1877f2;
      }

      .sso-button.facebook:hover {
          background-color: rgba(24, 119, 242, 0.05);
      }

      .sso-button.azure {
          border-color: #0078d4;
          color: #0078d4;
      }

      .sso-button.azure:hover {
          background-color: rgba(0, 120, 212, 0.05);
      }

      .sso-button.twitter {
          border-color: #1da1f2;
          color: #1da1f2;
      }

      .sso-button.twitter:hover {
          background-color: rgba(29, 161, 242, 0.05);
      }
  `],
  standalone: false
})
export class SSOButtonsComponent {
  /** List of OAuth providers to display */
  @Input() providers: SSOProvider[] = ['google', 'apple', 'github'];
  
  /** Mode determines button text (login vs signup) */
  @Input() mode: 'login' | 'signup' = 'login';
  
  /** Show/hide the "or" divider above buttons */
  @Input() showDivider = true;
  
  /** Custom divider text */
  @Input() dividerText = 'or';
  
  /** Emits when a provider is selected */
  @Output() providerSelected = new EventEmitter<SSOProvider>();
  
  selectProvider(provider: SSOProvider): void {
    this.providerSelected.emit(provider);
  }
  
  getProviderIcon(provider: SSOProvider): string {
    // These would be actual SVG icons registered in your app
    // For now, returning placeholder names
    return `logo-${ provider }`;
  }
  
  getButtonText(provider: SSOProvider): string {
    const action = this.mode === 'login' ? 'Sign in with' : 'Sign up with';
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    return `${ action } ${ providerName }`;
  }
}