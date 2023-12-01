import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { DbComment } from 'src/app/models/comment';

@Component({
  selector:        'app-comments-item',
  templateUrl:     './comments-item.component.html',
  styleUrls:       ['./comments-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsItemComponent implements OnInit {
  @Input() data: DbComment;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
