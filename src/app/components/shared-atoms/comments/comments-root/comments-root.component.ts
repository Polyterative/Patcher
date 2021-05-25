import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-comments-root',
  templateUrl:     './comments-root.component.html',
  styleUrls:       ['./comments-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsRootComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
