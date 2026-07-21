import { AdminFlagsComponent } from './admin-flags.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { AdminFlagsDataService } from './admin-flags-data.service';

type AdminFlagsDataServiceMock = Pick<AdminFlagsDataService, 'deleteFlag$'>;

describe('AdminFlagsComponent', () => {
  let fixture: ComponentFixture<AdminFlagsComponent>;
  let comp: AdminFlagsComponent;
  let mockDataService: AdminFlagsDataServiceMock;
  let injectedDataService: AdminFlagsDataService;
  let deleteFlagNextSpy: jasmine.Spy<(value: number) => void>;

  beforeEach(() => {
    mockDataService = { deleteFlag$: new Subject<number>() };
    deleteFlagNextSpy = spyOn(mockDataService.deleteFlag$, 'next').and.callThrough();

    TestBed.configureTestingModule({
      declarations: [AdminFlagsComponent],
      providers: [
        {provide: SupabaseService, useValue: {}},
        {provide: MatSnackBar, useValue: {}}
      ]
    })
      .overrideComponent(AdminFlagsComponent, {
        set: {
          template: '',
          providers: [{provide: AdminFlagsDataService, useValue: mockDataService}]
        }
      });

    fixture = TestBed.createComponent(AdminFlagsComponent);
    comp = fixture.componentInstance;
    injectedDataService = fixture.debugElement.injector.get(AdminFlagsDataService);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(injectedDataService);
  });

  it('confirmDelete emits deleteFlag$ when user confirms', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    comp.confirmDelete(42);
    expect(deleteFlagNextSpy).toHaveBeenCalledWith(42);
  });

  it('confirmDelete does not emit when user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    comp.confirmDelete(42);
    expect(deleteFlagNextSpy).not.toHaveBeenCalled();
  });
});
