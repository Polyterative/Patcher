import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                   from '@angular/core';
import { AppStateService }          from '../../../shared-interproject/app-state.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
  selector:        'app-module-browser-filters',
  templateUrl:     './module-browser-filters.component.html',
  styleUrls:       ['./module-browser-filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserFiltersComponent implements OnInit {
  
  constructor(
    public appState: AppStateService,
    public dataService: ModuleBrowserDataService
  ) { }
  
  ngOnInit(): void {
    
    
  }
  
}
