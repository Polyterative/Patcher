import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                   from '@angular/core';
import { DbModule } from '../../../models/models';

@Component({
  selector:        'app-module-details',
  templateUrl:     './module-details.component.html',
  styleUrls:       ['./module-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleDetailsComponent implements OnInit {
  @Input() data: DbModule;
  
  switches = [];
  
  constructor(
    // userManagerService: UserManagementService
  ) { }
  
  ngOnInit(): void {
    
  }
  
}
