import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import { UserCoolCollectionComponent } from './user-cool-collection.component';
import {
  UserCoolCollectionDataService,
  UserCoolCollectionViewModel
} from './user-cool-collection-data.service';

function makeVm(total: number): UserCoolCollectionViewModel {
  return {
    enabled: true,
    loading: false,
    total,
    groups: [
      {
        entityType: 'rack',
        title: 'Racks',
        icon: 'view_stream',
        emptyCopy: 'Public racks you mark Cool will land here.',
        items: []
      }
    ]
  };
}

describe('UserCoolCollectionComponent', () => {
  let fixture: ComponentFixture<UserCoolCollectionComponent>;

  async function build(entityType: 'module' | 'rack' | 'patch', total = 1) {
    const vm$ = new BehaviorSubject(makeVm(total));
    const dataService = {
      vm$: vm$.asObservable(),
      moduleData$: of([]),
      rackData$: of([{id: 10, name: 'Rack One'}]),
      patchData$: of([]),
      load$: new Subject()
    };

    TestBed.configureTestingModule({
      declarations: [UserCoolCollectionComponent],
      imports: [CommonModule],
      providers: [
        {provide: COOL_REACTIONS_ENABLED, useValue: true}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(UserCoolCollectionComponent, {
        set: {
          providers: [
            {provide: UserCoolCollectionDataService, useValue: dataService}
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserCoolCollectionComponent);
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('entityType', entityType);
    fixture.detectChanges();
  }

  it('renders rack Cool items through the standard rack list path', async () => {
    await build('rack');

    const host = fixture.nativeElement as HTMLElement;
    const rackList = host.querySelector('app-rack-list');

    expect(rackList).not.toBeNull();
    expect(host.querySelector('app-rack-micro')).toBeNull();
    expect(host.querySelector('flexbox-row-fast')).toBeNull();
  });

  it('preserves module Cool rendering through the module list path', async () => {
    await build('module');

    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('app-module-list')).not.toBeNull();
    expect(host.querySelector('app-rack-list')).toBeNull();
  });
});
