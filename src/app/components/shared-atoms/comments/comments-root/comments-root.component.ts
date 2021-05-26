import {
  ChangeDetectionStrategy,
  Component,
  Input
}                              from '@angular/core';
import { DbComment }           from '../../../../models/models';
import { CommentsDataService } from '../comments-data.service';

@Component({
  selector:        'app-comments-root',
  templateUrl:     './comments-root.component.html',
  styleUrls:       ['./comments-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsRootComponent {
  @Input() comments: DbComment[] = [];
  
  constructor(public dataService: CommentsDataService) { }
  
  
}
