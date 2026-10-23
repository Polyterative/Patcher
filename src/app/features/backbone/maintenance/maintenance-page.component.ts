import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  Meta,
  Title
} from '@angular/platform-browser';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-maintenance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, RouterLink],
  template: `
    <section class="maintenance" aria-labelledby="maintenance-title">
      <h1 id="maintenance-title">Down for maintenance</h1>
      <p>We're doing database maintenance. Patcher will be back soon.</p>
      <a mat-stroked-button routerLink="/">Back to home</a>
    </section>
  `,
  styles: [`
    .maintenance {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 6rem 1rem;
      text-align: center;
      color: var(--mat-sys-on-surface, inherit);
    }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    p { margin: 0; max-width: 32rem; line-height: 1.5; color: var(--mat-sys-on-surface-variant, inherit); }
  `]
})
export class MaintenancePageComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    this.title.setTitle('Maintenance | patcher.xyz');
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
  }
}
