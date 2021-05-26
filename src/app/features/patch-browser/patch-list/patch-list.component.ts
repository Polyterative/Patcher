import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewEncapsulation
}                       from '@angular/core';
import { Observable }   from 'rxjs';
import { PatchMinimal } from 'src/app/models/models';

@Component({
  selector:        'app-patch-list',
  templateUrl:     './patch-list.component.html',
  styleUrls:       ['./patch-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None
})
export class PatchListComponent implements OnInit {
  @Input()
  readonly data$: Observable<PatchMinimal>;
  
  ngOnInit(): void {
  }
  
}
