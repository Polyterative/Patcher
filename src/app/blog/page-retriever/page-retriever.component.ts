import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-page-retriever',
  templateUrl:     './page-retriever.component.html',
  styleUrls:       ['./page-retriever.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageRetrieverComponent implements OnInit {
  
  constructor() {
  }
  
  ngOnInit() {
  }
  
}
