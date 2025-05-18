import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Output
} from '@angular/core';
import { UserLoginDataService } from '../user-login-data.service';
import { FormControl } from '@angular/forms';


@Component({
  selector:        'app-login-email',
  templateUrl:     './login-email.component.html',
  styleUrls:       ['./login-email.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
