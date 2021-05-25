import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-comments-item',
  templateUrl:     './comments-item.component.html',
  styleUrls:       ['./comments-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsItemComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
