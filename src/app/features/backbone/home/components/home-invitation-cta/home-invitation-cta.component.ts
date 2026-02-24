import {
  Component,
  Input
} from '@angular/core';


@Component({
  selector: 'app-home-invitation-cta',
  templateUrl: './home-invitation-cta.component.html',
  styleUrls: ['./home-invitation-cta.component.scss'],
  standalone: false
})
export class HomeInvitationCtaComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() imageSrc = '';
  @Input() imageAlt = '';
}