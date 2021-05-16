import {
  Component,
  OnDestroy
}                          from '@angular/core';
import { Router }          from '@angular/router';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  CardLinkDataModel,
  cleanCardlinkModelObject
}                          from 'src/app/shared-interproject/components/@smart/list-link-router/clickable-list-card-base';

@Component({
  selector:    'app-home',
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnDestroy {
  iconColor = '#041E50';
  
  destroyEvent$: Subject<void> = new Subject();
  
  readonly linksData: CardLinkDataModel = {
    ...cleanCardlinkModelObject,
    links: []
  };
  
  statistics$ = new BehaviorSubject<Array<number | string>>([
    '...',
    '...',
    '...'
  ]);
  
  constructor(
    public backend: SupabaseService,
    private router: Router
  ) {
    this.backend.get.statistics()
        .pipe(
        )
        .subscribe(value => {
          this.statistics$.next(value);
        });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
}
