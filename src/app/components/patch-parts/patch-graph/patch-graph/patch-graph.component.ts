import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-patch-graph',
  templateUrl: './patch-graph.component.html',
  styleUrls: ['./patch-graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchGraphComponent implements OnInit {

  ngOnInit(): void {
  }
  
  

}
