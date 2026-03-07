import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


export type SSOProvider =
  | 'google'
  | 'apple'
  | 'github'
  | 'facebook'
  | 'azure'
  | 'twitter';

interface ProviderConfig {
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly ariaLabel?: string;
}

/**
 * SSO Buttons Component
 *
 * Displays social authentication buttons that handle BOTH login and signup.
 * Following industry best practices (Google, Microsoft, GitHub, Notion, Linear, Slack),
 * SSO buttons don't distinguish between login/signup - the OAuth provider handles
 * account creation automatically if the user doesn't exist.
 *
 * The button text uses "Continue with" which is neutral and works for both flows,
 * just like major platforms do.
 *
 * @example
 * ```html
 * <app-sso-buttons
 *   [providers]="['google', 'apple', 'github']"
 *   [showDivider]="true"
 *   [dividerText]="'or'"
 *   (providerSelected)="handleSSO($event)">
 * </app-sso-buttons>
 * ```
 */
@Component({
  selector: 'app-sso-buttons',
  templateUrl: './sso-buttons.component.html',
  styleUrls: ['./sso-buttons.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ]
})
export class SSOButtonsComponent {
  /** Array of SSO providers to display buttons for */
  @Input() providers: SSOProvider[] = ['google'];
  
  /** Whether to show a divider above the buttons */
  @Input() showDivider = true;
  
  /** Text to display in the divider */
  @Input() dividerText = 'or';
  
  /** Whether the component is in a loading state */
  @Input() isLoading = false;
  
  /** Emits when a user selects an SSO provider */
  @Output() providerSelected = new EventEmitter<SSOProvider>();
  
  /** Tracks which provider is currently loading (if any) */
  loadingProvider: SSOProvider | null = null;
  
  /** Configuration for each SSO provider */
  readonly config: Record<SSOProvider, ProviderConfig> = {
    google: {
      name: 'Google',
      icon: '',
      color: '#DB4437',
      ariaLabel: 'Continue with Google account'
    },
    apple: {
      name: 'Apple',
      icon: '',
      color: '#000000',
      ariaLabel: 'Continue with Apple ID'
    },
    github: {
      name: 'GitHub',
      icon: '',
      color: '#181717',
      ariaLabel: 'Continue with GitHub account'
    },
    facebook: {
      name: 'Facebook',
      icon: '',
      color: '#0866FF',
      ariaLabel: 'Continue with Facebook account'
    },
    azure: {
      name: 'Microsoft',
      icon: '',
      color: '#00A4EF',
      ariaLabel: 'Continue with Microsoft account'
    },
    twitter: {
      name: 'X',
      icon: '',
      color: '#000000',
      ariaLabel: 'Continue with X account'
    }
  };
  
  /**
   * Handles provider selection and emits the event
   * Sets loading state for visual feedback
   */
  selectProvider(provider: SSOProvider): void {
    if (this.isLoading) {
      return;
    }
    
    this.loadingProvider = provider;
    this.providerSelected.emit(provider);
  }
  
  /**
   * Gets the button text for a provider
   * Uses "Continue with" - industry standard that works for both login and signup
   * This is what Google, GitHub, Notion, Linear, and other modern apps use
   */
  getButtonText(provider: SSOProvider): string {
    return `Continue with ${ this.config[provider].name }`;
  }
  
  /**
   * Gets the ARIA label for a provider button
   */
  getAriaLabel(provider: SSOProvider): string {
    return this.config[provider].ariaLabel || `Continue with ${ this.config[provider].name }`;
  }
}