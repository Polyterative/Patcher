import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrandPrimaryButtonComponent } from '../brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from '../clean-card/clean-card.component';


/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FlexLayoutModule, BrandPrimaryButtonComponent, CleanCardComponent]
})
export class UserAvatarComponent {
  @Output()
  readonly logoff$ = new EventEmitter<void>();
  
  @Output()
  readonly login$ = new EventEmitter<void>();
  
  @Output()
  readonly signup$ = new EventEmitter<void>();
  
  @Input()
  name: string = '';
  
  @Input()
  hideLogoff: boolean = false;
  
  @Input()
  backgroundImagePath: string = './default.svg';
  
  constructor() {
  }
  
}