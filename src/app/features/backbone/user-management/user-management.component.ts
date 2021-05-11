import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                from '@angular/core';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';

@Component({
  selector:        'app-user-management',
  templateUrl:     './user-management.component.html',
  styleUrls:       ['./user-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  
  constructor(
    public userManagementService: UserManagementService
  ) { }
  
  ngOnInit(): void {
  }
  
}
