import {
  Component,
  Input,
  NO_ERRORS_SCHEMA
} from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { ModuleCollectionsBrowserDataService } from '../module-collections-browser-data.service';
import { ModuleCollectionsBrowserRootComponent } from './module-collections-browser-root.component';

@Component({
  selector: 'lib-hero-content-card',
  template: '<ng-content></ng-content>',
  standalone: false
})
class HeroContentCardStubComponent {
  @Input() titleBig = '';
  @Input() titleNormal = '';
  @Input() description = '';
  @Input() icon = '';
}

describe('ModuleCollectionsBrowserRootComponent', () => {
  let fixture: ComponentFixture<ModuleCollectionsBrowserRootComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ModuleCollectionsBrowserRootComponent,
        HeroContentCardStubComponent
      ],
      imports: [
        CommonModule
      ],
      providers: [
        {
          provide: ModuleCollectionsBrowserDataService,
          useValue: {
            collections$: new BehaviorSubject([]),
            loading$: new BehaviorSubject(false),
            hasMore$: new BehaviorSubject(false),
            remainingCount$: new BehaviorSubject(0),
            loadMore$: new Subject<void>(),
            resetForm$: new Subject<void>(),
            canReset$: of(false),
            fields: {
              search: {
                control: new FormControl(''),
                type: 'text',
                label: 'Search collections'
              },
              order: {
                control: new FormControl({ id: 'updated_desc', name: 'Recently updated' }),
                type: 'select',
                label: 'Order by',
                options$: of([{ id: 'updated_desc', name: 'Recently updated' }])
              }
            }
          }
        },
        {
          provide: SeoAndUtilsService,
          useValue: {
            updateSeo: jasmine.createSpy('updateSeo')
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ModuleCollectionsBrowserRootComponent, {
        set: {
          providers: []
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ModuleCollectionsBrowserRootComponent);
    fixture.detectChanges();
  });

  it('shows the wide-shell nav like the module browser page', () => {
    const hero = fixture.debugElement.query(By.directive(HeroContentCardStubComponent));

    expect(hero.componentInstance.titleBig).toBe('Collections');
  });
});
