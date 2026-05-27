import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-invitation-cta',
  templateUrl: './home-invitation-cta.component.html',
  styleUrls: ['./home-invitation-cta.component.scss'],
  standalone: true
})
export class HomeInvitationCtaComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() imageSrc = '';
  @Input() imageAlt = '';
}