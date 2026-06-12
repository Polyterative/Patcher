import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Output
} from '@angular/core';
import { UserLoginDataService } from '../user-login-data.service';
import { FormControl } from '@angular/forms';
import { FlexModule } from '@angular/flex-layout/flex';
import { MatFormEntityComponent } from '../../../../../shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from '../../../../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';


@Component({
    selector: 'app-login-email',
    templateUrl: './login-email.component.html',
    styleUrls: ['./login-email.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FlexModule, MatFormEntityComponent, BrandPrimaryButtonComponent]
})
export class LoginEmailComponent implements OnInit {
  
  @Output() emailChange = new EventEmitter<string>();

  constructor(public dataService: UserLoginDataService) { }
  
  ngOnInit(): void {
    const emailControl: FormControl = this.dataService.fields.user.control;
    emailControl.valueChanges.subscribe(value => {
      this.emailChange.emit(value);
    });
  }
  
}