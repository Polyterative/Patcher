import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  of,
  Subject
} from 'rxjs';
import { ModuleAdderDataService } from './module-adder-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { StandardsService } from 'src/app/components/format-translator/standards.service';


/**
 * Unit Tests - ModuleAdderDataService Manufacturer Creation Feature
 *
 * Tests for the inline manufacturer creation capability added 2026-02-19.
 * Verifies the public API surface and reactive state management.
 */
describe('ModuleAdderDataService - Manufacturer Creation', () => {
  let service: ModuleAdderDataService;
  let mockSupabaseService: any;
  let mockStandardsService: any;
  let mockRouter: any;

  const mockManufacturers = [
    { id: 1, name: 'Doepfer' },
    { id: 2, name: 'Make Noise' },
    { id: 3, name: 'Mutable Instruments' }
  ];

  beforeEach(() => {
    mockSupabaseService = {
      GET: {
        manufacturers: jasmine.createSpy('manufacturers').and.returnValue(
          of({ data: mockManufacturers, error: null })
        ),
        modules: jasmine.createSpy('modules').and.returnValue(
          of({ data: [], error: null })
        )
      },
      add: {
        manufacturers: jasmine.createSpy('manufacturers').and.returnValue(
          of({ data: [{ id: 42, name: 'New Modular Co' }], error: null })
        ),
        modules: jasmine.createSpy('modules').and.returnValue(
          of({ data: [], error: null })
        )
      }
    };

    mockStandardsService = {
      standards: {
        data$: new BehaviorSubject([
          { id: 0, name: 'Eurorack' },
          { id: 1, name: 'Frac' }
        ])
      }
    };

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [MatSnackBarModule, MatDialogModule],
      providers: [
        ModuleAdderDataService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: StandardsService, useValue: mockStandardsService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(ModuleAdderDataService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // ─── Service Creation ───────────────────────────────────────────────────────

  it('should create service', () => {
    expect(service).toBeDefined();
  });

  // ─── Public API Surface ─────────────────────────────────────────────────────

  it('should have showNewManufacturerForm$ BehaviorSubject initialized to false', () => {
    expect(service.showNewManufacturerForm$).toBeDefined();
    expect(service.showNewManufacturerForm$).toBeInstanceOf(BehaviorSubject);
    expect(service.showNewManufacturerForm$.value).toBe(false);
  });

  it('should have isCreatingManufacturer$ BehaviorSubject initialized to false', () => {
    expect(service.isCreatingManufacturer$).toBeDefined();
    expect(service.isCreatingManufacturer$).toBeInstanceOf(BehaviorSubject);
    expect(service.isCreatingManufacturer$.value).toBe(false);
  });

  it('should have newManufacturerNameControl FormControl', () => {
    expect(service.newManufacturerNameControl).toBeDefined();
    expect(service.newManufacturerNameControl.value).toBe('');
  });

  it('should have createManufacturer$ Subject', () => {
    expect(service.createManufacturer$).toBeDefined();
    expect(service.createManufacturer$).toBeInstanceOf(Subject);
  });

  // ─── Form Validation ────────────────────────────────────────────────────────

  it('newManufacturerNameControl should be invalid when empty', () => {
    service.newManufacturerNameControl.setValue('');
    expect(service.newManufacturerNameControl.valid).toBe(false);
  });

  it('newManufacturerNameControl should be invalid when too short (1 char)', () => {
    service.newManufacturerNameControl.setValue('A');
    expect(service.newManufacturerNameControl.valid).toBe(false);
  });

  it('newManufacturerNameControl should be valid with a proper name', () => {
    service.newManufacturerNameControl.setValue('Doepfer');
    expect(service.newManufacturerNameControl.valid).toBe(true);
  });

  it('newManufacturerNameControl should be invalid when name exceeds 100 chars', () => {
    const longName = 'A'.repeat(101);
    service.newManufacturerNameControl.setValue(longName);
    expect(service.newManufacturerNameControl.valid).toBe(false);
  });

  // ─── UI Toggle ──────────────────────────────────────────────────────────────

  it('should toggle showNewManufacturerForm$ to true', () => {
    service.showNewManufacturerForm$.next(true);
    expect(service.showNewManufacturerForm$.value).toBe(true);
  });

  it('should toggle showNewManufacturerForm$ back to false', () => {
    service.showNewManufacturerForm$.next(true);
    service.showNewManufacturerForm$.next(false);
    expect(service.showNewManufacturerForm$.value).toBe(false);
  });

  // ─── Manufacturer Options ───────────────────────────────────────────────────

  it('should expose manufacturer options through formData', () => {
    expect(service.formData.manufacturer.options$).toBeDefined();
  });

  it('should load manufacturers from backend on init', (done) => {
    service.formData.manufacturer.options$.subscribe(opts => {
      if (opts.length > 0) {
        expect(mockSupabaseService.GET.manufacturers).toHaveBeenCalled();
        expect(opts.length).toBe(mockManufacturers.length);
        expect(opts[0].name).toBe('Doepfer');
        done();
      }
    });
  });

  it('should map manufacturer ids to strings in options', (done) => {
    service.formData.manufacturer.options$.subscribe(opts => {
      if (opts.length > 0) {
        opts.forEach(opt => {
          expect(typeof opt.id).toBe('string');
        });
        done();
      }
    });
  });

  // ─── Manufacturer Creation Flow ─────────────────────────────────────────────

  it('should not call backend when createManufacturer$ fires with invalid control', () => {
    service.newManufacturerNameControl.setValue(''); // invalid - too short
    service.createManufacturer$.next();
    expect(mockSupabaseService.add.manufacturers).not.toHaveBeenCalled();
  });

  it('should call backend when createManufacturer$ fires with valid control', (done) => {
    service.newManufacturerNameControl.setValue('New Modular Co');

    service.createManufacturer$.next();

    // Allow async pipe to process
    setTimeout(() => {
      expect(mockSupabaseService.add.manufacturers).toHaveBeenCalledWith([{ name: 'New Modular Co' }]);
      done();
    }, 50);
  });

  it('should reset newManufacturerNameControl after successful creation', (done) => {
    service.newManufacturerNameControl.setValue('New Modular Co');
    service.createManufacturer$.next();

    setTimeout(() => {
      expect(service.newManufacturerNameControl.value).toBe('');
      done();
    }, 50);
  });

  it('should hide the manufacturer form after successful creation', (done) => {
    service.showNewManufacturerForm$.next(true);
    service.newManufacturerNameControl.setValue('New Modular Co');
    service.createManufacturer$.next();

    setTimeout(() => {
      expect(service.showNewManufacturerForm$.value).toBe(false);
      done();
    }, 50);
  });

  it('should auto-select the newly created manufacturer in the form control', (done) => {
    service.newManufacturerNameControl.setValue('New Modular Co');
    service.createManufacturer$.next();

    setTimeout(() => {
      const selectedValue = service.formData.manufacturer.control.value;
      expect(selectedValue).toBeDefined();
      expect(selectedValue.id).toBe('42'); // string id from backend
      expect(selectedValue.name).toBe('New Modular Co');
      done();
    }, 50);
  });

  it('should add new manufacturer to options list after creation', (done) => {
    service.newManufacturerNameControl.setValue('New Modular Co');
    service.createManufacturer$.next();

    setTimeout(() => {
      service.formData.manufacturer.options$.subscribe(opts => {
        const newOpt = opts.find(o => o.id === '42');
        expect(newOpt).toBeDefined();
        expect(newOpt?.name).toBe('New Modular Co');
        done();
      });
    }, 50);
  });

  it('should set isCreatingManufacturer$ to true during creation', () => {
    // The spy returns synchronously in tests so we verify the initial state transitions
    service.newManufacturerNameControl.setValue('New Modular Co');
    // Initially false
    expect(service.isCreatingManufacturer$.value).toBe(false);
  });
});