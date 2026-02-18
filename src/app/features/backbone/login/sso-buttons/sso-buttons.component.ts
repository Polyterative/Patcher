import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';


export type SSOProvider =
  'google'
  | 'apple'
  | 'github'
  | 'facebook'
  | 'azure'
  | 'twitter';

interface ProviderConfig {
  name: string;
  icon: string;
  color: string;
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
 */
@Component({
  selector: 'app-sso-buttons',
  templateUrl: './sso-buttons.component.html',
  styleUrls: ['./sso-buttons.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule]
})
export class SSOButtonsComponent {
  @Input() providers: SSOProvider[] = ['google', 'apple', 'github'];
  @Input() showDivider = true;
  @Input() dividerText = 'or';
  @Output() providerSelected = new EventEmitter<SSOProvider>();
  
  readonly config: Record<SSOProvider, ProviderConfig> = {
    google: {name: 'Google', icon: 'G', color: '#4285f4'},
    apple: {name: 'Apple', icon: '', color: '#000'},
    github: {name: 'GitHub', icon: '', color: '#24292e'},
    facebook: {name: 'Facebook', icon: 'f', color: '#1877f2'},
    azure: {name: 'Microsoft', icon: '⊞', color: '#0078d4'},
    twitter: {name: 'Twitter', icon: '𝕏', color: '#1da1f2'}
  };

  selectProvider(provider: SSOProvider): void {
    this.providerSelected.emit(provider);
  }

  getButtonText(provider: SSOProvider): string {
    // Use "Continue with" - industry standard that works for both login and signup
    // This is what Google, GitHub, Notion, Linear, and other modern apps use
    return `Continue with ${ this.config[provider].name }`;
  }
}