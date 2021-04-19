import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import { Subject }         from 'rxjs';
import { SupabaseService } from '../supabase.service';

@Component({
  selector:        'app-admin-panel-root',
  templateUrl:     './admin-panel-root.component.html',
  styleUrls:       ['./admin-panel-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPanelRootComponent implements OnInit {
  devToProd$ = new Subject();
  downloadProd$ = new Subject();
  downloadDev$ = new Subject();
  prodToDev$ = new Subject();
  click$ = new Subject();
  
  constructor(public backend: SupabaseService) { }
  
  ngOnInit(): void {
    
  }
  
}
