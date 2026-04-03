import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import { take } from 'rxjs/operators';
import {
  FLAG_CATEGORY_GROUPS,
  FLAG_CATEGORIES,
  ModuleFlagDataService
} from './module-flag-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';


function setupTest() {
  const mockModuleFlag = jasmine.createSpy('add.moduleFlag').and.returnValue(of({}));
  const mockBackend = {add: {moduleFlag: mockModuleFlag}};
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

  TestBed.configureTestingModule({
    providers: [
      ModuleFlagDataService,
      {provide: SupabaseService, useValue: mockBackend},
      {provide: MatSnackBar, useValue: mockSnackBar}
    ]
  });

  const service = TestBed.inject(ModuleFlagDataService);
  return {service, mockBackend, mockSnackBar};
}

function cleanup() {
  TestBed.resetTestingModule();
}

describe('ModuleFlagDataService', () => {
  afterEach(() => cleanup());

  describe('API surface', () => {
    it('should expose formVisible$ Observable', () => {
      const {service} = setupTest();
      expect(service.formVisible$).toBeDefined();
      expect(typeof service.formVisible$.subscribe).toBe('function');
    });

    it('should expose moduleId$ ReplaySubject', () => {
      const {service} = setupTest();
      expect(service.moduleId$).toBeDefined();
      expect(service.moduleId$ instanceof ReplaySubject).toBeTrue();
    });

    it('should expose toggleForm$ Subject', () => {
      const {service} = setupTest();
      expect(service.toggleForm$).toBeDefined();
      expect(service.toggleForm$ instanceof Subject).toBeTrue();
    });

    it('should expose submitFlag$ Subject', () => {
      const {service} = setupTest();
      expect(service.submitFlag$).toBeDefined();
      expect(service.submitFlag$ instanceof Subject).toBeTrue();
    });
  });

  describe('FLAG_CATEGORIES constant', () => {
    it('should expose grouped categories for the select UI', () => {
      expect(FLAG_CATEGORY_GROUPS.length).toBe(4);
      expect(FLAG_CATEGORY_GROUPS.map(group => group.label)).toEqual([
        'Module details',
        'Specs and setup',
        'Images and links',
        'Catalogue'
      ]);
    });

    it('should contain the expanded set of issue categories', () => {
      const values = FLAG_CATEGORIES.map(c => c.value);
      expect(values).toContain('wrong-name');
      expect(values).toContain('wrong-manufacturer');
      expect(values).toContain('wrong-hp');
      expect(values).toContain('wrong-power');
      expect(values).toContain('wrong-depth-weight');
      expect(values).toContain('wrong-io');
      expect(values).toContain('wrong-description');
      expect(values).toContain('missing-panel-image');
      expect(values).toContain('wrong-panel-image');
      expect(values).toContain('duplicate-panel-image');
      expect(values).toContain('panel-image-cropped');
      expect(values).toContain('missing-manual');
      expect(values).toContain('broken-manual-link');
      expect(values).toContain('duplicate');
      expect(values).toContain('wrong-tags');
      expect(values).toContain('other');
    });

    it('should have a label for each category', () => {
      FLAG_CATEGORIES.forEach(c => {
        expect(c.label.length).toBeGreaterThan(0);
      });
    });

    it('should flatten all grouped options into FLAG_CATEGORIES', () => {
      const groupedValues = FLAG_CATEGORY_GROUPS.flatMap(group => group.options.map(option => option.value));
      expect(FLAG_CATEGORIES.map(category => category.value)).toEqual(groupedValues as any);
    });
  });

  describe('toggleForm$', () => {
    it('should start with form hidden', done => {
      const {service} = setupTest();
      service.formVisible$.pipe(take(1)).subscribe(visible => {
        expect(visible).toBeFalse();
        done();
      });
    });

    it('should show form after first toggle', done => {
      const {service} = setupTest();
      service.toggleForm$.next();
      service.formVisible$.pipe(take(1)).subscribe(visible => {
        expect(visible).toBeTrue();
        done();
      });
    });

    it('should hide form after second toggle', done => {
      const {service} = setupTest();
      service.toggleForm$.next();
      service.toggleForm$.next();
      service.formVisible$.pipe(take(1)).subscribe(visible => {
        expect(visible).toBeFalse();
        done();
      });
    });
  });

  describe('submitFlag$', () => {
    it('should call backend.add.moduleFlag with correct payload', done => {
      const {service, mockBackend} = setupTest();
      service.moduleId$.next(42);
      service.submitFlag$.next({category: 'wrong-power', note: 'Should only use +12V'});
      setTimeout(() => {
        expect(mockBackend.add.moduleFlag).toHaveBeenCalledWith({
          module_id: 42,
          category: 'wrong-power',
          note: 'Should only use +12V'
        });
        done();
      }, 0);
    });

    it('should call backend.add.moduleFlag with null note when note is empty', done => {
      const {service, mockBackend} = setupTest();
      service.moduleId$.next(7);
      service.submitFlag$.next({category: 'duplicate', note: ''});
      setTimeout(() => {
        expect(mockBackend.add.moduleFlag).toHaveBeenCalledWith({
          module_id: 7,
          category: 'duplicate',
          note: null
        });
        done();
      }, 0);
    });

    it('should show success snackbar on successful submit', done => {
      const {service, mockSnackBar} = setupTest();
      service.moduleId$.next(1);
      service.submitFlag$.next({category: 'other', note: 'some note'});
      setTimeout(() => {
        expect(mockSnackBar.open).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should hide form after successful submit', done => {
      const {service} = setupTest();
      service.moduleId$.next(1);
      service.toggleForm$.next();
      service.submitFlag$.next({category: 'missing-panel-image', note: ''});
      setTimeout(() => {
        service.formVisible$.pipe(take(1)).subscribe(visible => {
          expect(visible).toBeFalse();
          done();
        });
      }, 0);
    });
  });
});
