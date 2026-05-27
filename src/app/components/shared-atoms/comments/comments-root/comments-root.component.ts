import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { CommentsDataService } from '../comments-data.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";


@Component({
  selector: 'app-comments-root',
  templateUrl: './comments-root.component.html',
  styleUrls: ['./comments-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('725ms ease', style({ opacity: 1 }))
      ])
    ])
  ],
  standalone: false
})
export class CommentsRootComponent {
  
  
  constructor(
    public dataService: CommentsDataService,
    public appState: AppStateService,
    public userManagerService: UserManagementService
  ) { }
  
}