import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  Subject,
} from 'rxjs';
import { RackDetailDataService } from '../../rack-detail-data.service';
import { MapToModulePipe } from '../../map-to-module.pipe';
import { HasUnrackedModulesPipe } from './has-unracked-modules.pipe';
import { RackVisualModelComponent } from './rack-visual-model.component';


describe('RackVisualModelComponent', () => {
  let fixture: ComponentFixture<RackVisualModelComponent>;
  let component: RackVisualModelComponent;
  let moduleRef: any;
  let rackDetailDataService: {
    shouldShowPanelImages$: Subject<boolean>;
    currentDownloadElementRef$: {next: jasmine.Spy};
  };

  beforeEach(async () => {
    rackDetailDataService = {
      shouldShowPanelImages$: new Subject<boolean>(),
      currentDownloadElementRef$: {next: jasmine.createSpy('next')},
    };

    await TestBed.configureTestingModule({
      declarations: [
        RackVisualModelComponent,
        MapToModulePipe,
        HasUnrackedModulesPipe,
      ],
      imports: [
        CommonModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: RackDetailDataService,
          useValue: rackDetailDataService,
        }
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RackVisualModelComponent);
    component = fixture.componentInstance;
    moduleRef = {
      module: {
        hp: 14,
        panels: [],
        powerPos12: null,
        powerNeg12: null,
        powerPos5: null,
      },
      rackingData: {
        hpOverride: 16,
        selectedPanelId: null,
      }
    } as any;
    component.rackData = {hp: 104} as any;
    component.rowedRackedModules = [[moduleRef]];
    component.isCurrentRackEditable = true;
    component.isCurrentRackPropertyOfCurrentUser = true;
    component.rackDetailDataService = rackDetailDataService as any;
    component.moduleRightClick$ = new Subject<any>();
  });

  it('shows the per-module HP badge in edit mode', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const badge = host.querySelector('.hpIndicator');

    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('16HP');
  });

  it('renders module hover stats and reveals them on hover', () => {
    fixture.detectChanges();

    component.setHoveredModule(moduleRef);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const hoverStats = host.querySelector('.moduleHoverStats');
    expect(hoverStats).not.toBeNull();
    expect(component.isHoveredModule(moduleRef)).toBeTrue();
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('HP16HP');
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('PWRn/a');
  });

  it('hides the per-module HP badge outside edit mode', () => {
    component.isCurrentRackEditable = false;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hpIndicator')).toBeNull();
    expect(host.querySelector('.moduleHoverStats')).not.toBeNull();
  });
});
