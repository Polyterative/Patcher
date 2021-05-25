import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-comments-editor',
  templateUrl:     './comments-editor.component.html',
  styleUrls:       ['./comments-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsEditorComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
