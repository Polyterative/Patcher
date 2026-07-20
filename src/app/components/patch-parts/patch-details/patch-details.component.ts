import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { animate, animateChild, query, style, transition, trigger } from '@angular/animations';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { Patch } from 'src/app/models/patch';


@Component({
  selector: 'app-patch-details',
  templateUrl: './patch-details.component.html',
  styleUrls: ['./patch-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('1525ms {{ delay }}ms ease', style({opacity: 1})),
        query('@*', animateChild(), { optional: true })
      ], { params: { delay: 0 } })
    ])
  ],
  standalone: false
})
export class PatchDetailsComponent implements OnInit {
  @Input() data: Patch;
  @Input() isEditing: boolean = false;
  @Input() showConnectionsList: boolean = true;
  
  switches = [];
  
  constructor(
    public dataService: PatchDetailDataService
    // userManagerService: UserManagementService
  ) { }
  
  ngOnInit(): void {
  
  }
  
}