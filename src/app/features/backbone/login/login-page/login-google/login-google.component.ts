import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-login-google',
  templateUrl:     './login-google.component.html',
  styleUrls:       ['./login-google.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginGoogleComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
