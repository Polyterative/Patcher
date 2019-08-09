import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-word-swapper',
  templateUrl:     './word-swapper.component.html',
  styleUrls:       ['./word-swapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WordSwapperComponent implements OnInit {
  
  constructor() {
  }
  
  ngOnInit() {
  }
  
}
