import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
} from '@angular/core';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector:        'app-user-avatar',
  templateUrl:     './user-avatar.component.html',
  styleUrls:       ['./user-avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAvatarComponent {
  @Output()
  readonly logoff$ = new EventEmitter<void>();

  @Output()
  readonly login$ = new EventEmitter<void>();

  @Input()
  name: string = '';

  @Input()
  hideLogoff: boolean = false;

  @Input()
  backgroundImagePath: string = './default.svg';

}
