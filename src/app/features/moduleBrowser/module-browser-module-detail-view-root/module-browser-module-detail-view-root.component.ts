import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector:        'app-module-browser-module-detail-view-root',
  templateUrl:     './module-browser-module-detail-view-root.component.html',
  styleUrls:       ['./module-browser-module-detail-view-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleDetailViewRootComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}