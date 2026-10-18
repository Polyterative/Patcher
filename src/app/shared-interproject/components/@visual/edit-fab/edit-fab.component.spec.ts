import { TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { of } from 'rxjs';
import { EditFabComponent } from './edit-fab.component';
import { environment } from 'src/environments/environment';

function makeComp(): EditFabComponent {
  return TestBed.runInInjectionContext(() => new EditFabComponent());
}

describe('EditFabComponent', () => {
  describe('default inputs', () => {
    it('hasPendingChanges$ defaults to of(false)', (done) => {
      const comp = makeComp();
      comp.hasPendingChanges$.subscribe(v => {
        expect(v).toBeFalse();
        done();
      });
    });

    it('openLabel defaults to "Edit"', () => {
      expect(makeComp().openLabel).toBe('Edit');
    });

    it('closeLabel defaults to "Close editor"', () => {
      expect(makeComp().closeLabel).toBe('Close editor');
    });

    it('discardLabel defaults to "Discard changes"', () => {
      expect(makeComp().discardLabel).toBe('Discard changes');
    });

    it('openIcon defaults to "edit"', () => {
      expect(makeComp().openIcon).toBe('edit');
    });

    it('closeIcon defaults to "close"', () => {
      expect(makeComp().closeIcon).toBe('close');
    });

    it('discardIcon defaults to "warning"', () => {
      expect(makeComp().discardIcon).toBe('warning');
    });

    it('toggle$ is an EventEmitter', () => {
      expect(makeComp().toggle$).toBeInstanceOf(EventEmitter);
    });
  });

  describe('bouncing$', () => {
    it('is an Observable (not null/undefined)', () => {
      expect(makeComp().bouncing$).toBeTruthy();
    });
  });

  describe('input overrides', () => {
    it('accepts custom openLabel', () => {
      const comp = makeComp();
      comp.openLabel = 'Customize';
      expect(comp.openLabel).toBe('Customize');
    });

    it('accepts custom editMode$ observable', () => {
      const comp = makeComp();
      comp.editMode$ = of(true);
      expect(comp.editMode$).toBeTruthy();
    });
  });
});

describe('EditFabComponent read-only mode', () => {
  afterEach(() => {
    environment.features.readOnlyModeEnabled = false;
  });
  
  function render(enabled: boolean) {
    TestBed.configureTestingModule({imports: [EditFabComponent]});
    environment.features.readOnlyModeEnabled = enabled;
    const fixture = TestBed.createComponent(EditFabComponent);
    fixture.componentInstance.editMode$ = of(false);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }
  
  it('disables the open button when read-only mode is on', () => {
    expect(render(true).disabled).toBeTrue();
  });
  
  it('keeps the open button enabled when read-only mode is off', () => {
    expect(render(false).disabled).toBeFalse();
  });
});
