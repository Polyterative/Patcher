import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation
} from '@angular/core';

@Component({
  selector:        'app-patch-connection-symbol',
  templateUrl:     './patch-connection-symbol.component.html',
  styleUrls:       ['./patch-connection-symbol.component.scss'],
  encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchConnectionSymbolComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
