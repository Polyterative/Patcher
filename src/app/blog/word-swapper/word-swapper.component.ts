import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                            from '@angular/core';
import { BehaviorSubject }   from 'rxjs';
import { AngularEntityBase } from '../../Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';

@Component({
  selector:        'app-word-swapper',
  templateUrl:     './word-swapper.component.html',
  styleUrls:       ['./word-swapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WordSwapperComponent extends AngularEntityBase implements OnInit {
  
  @Input()
  words: string[];
  
  curr: BehaviorSubject<string> = new BehaviorSubject('');
  
  
  constructor() {
    super();
  }
  
  ngOnInit(): void {
    console.warn(this.words);
  }
  
  
}
