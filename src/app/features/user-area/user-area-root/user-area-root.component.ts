import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                from '@angular/core';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService }       from 'src/app/features/backend/supabase.service';

@Component({
  selector:        'app-user-area-root',
  templateUrl:     './user-area-root.component.html',
  styleUrls:       ['./user-area-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAreaRootComponent implements OnInit {
  
  constructor(
    public userService: UserManagementService,
    public backend: SupabaseService
  ) { }
  
  ngOnInit(): void {
  }
  
}
