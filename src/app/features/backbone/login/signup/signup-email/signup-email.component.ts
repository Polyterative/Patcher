import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                from '@angular/core';
import { UserSignupDataService } from '../user-signup-data.service';

@Component({
  selector:        'app-signup-email',
  templateUrl:     './signup-email.component.html',
  styleUrls:       ['./signup-email.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupEmailComponent implements OnInit {
  
  constructor(public dataService: UserSignupDataService) { }
  
  ngOnInit(): void {
  }
  
}
