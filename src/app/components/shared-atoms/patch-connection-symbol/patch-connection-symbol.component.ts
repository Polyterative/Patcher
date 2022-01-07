import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-patch-connection-symbol',
  templateUrl:     './patch-connection-symbol.component.html',
  styleUrls:       ['./patch-connection-symbol.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchConnectionSymbolComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
