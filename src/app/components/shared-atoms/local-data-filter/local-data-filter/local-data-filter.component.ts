import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                 from '@angular/core';
import { LocalDataFilterService } from '../local-data-filter.service';

@Component({
  selector:        'app-local-data-filter',
  templateUrl:     './local-data-filter.component.html',
  styleUrls:       ['./local-data-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocalDataFilterComponent implements OnInit {
  
  constructor(public dataService: LocalDataFilterService) { }
  
  ngOnInit(): void {
  }
  
}
