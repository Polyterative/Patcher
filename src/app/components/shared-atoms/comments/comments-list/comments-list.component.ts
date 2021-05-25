import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-comments-list',
  templateUrl:     './comments-list.component.html',
  styleUrls:       ['./comments-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsListComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
