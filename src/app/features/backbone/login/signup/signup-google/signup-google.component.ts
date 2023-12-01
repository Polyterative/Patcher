import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector:        'app-signup-google',
  templateUrl:     './signup-google.component.html',
  styleUrls:       ['./signup-google.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupGoogleComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
