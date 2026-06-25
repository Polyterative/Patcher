import { CommonModule } from '@angular/common';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  REACTION_KIND_COOL,
  ReactionEntityTypes,
  type ReactionRow
} from 'src/app/features/backend/supabase-reactions';
import { COOL_REACTIONS_ENABLED } from './cool-button-feature.token';
import { CoolButtonComponent } from './cool-button.component';
import { CoolButtonDataService } from './cool-button-data.service';

interface BackendStub {
  get: {
    currentUserReactions: jasmine.Spy;
    reactionCount: jasmine.Spy;
  };
  add: {
    reaction: jasmine.Spy;
  };
  delete: {
    reaction: jasmine.Spy;
  };
}

function makeReaction(entityId: number): ReactionRow {
  return {
    user_id: 'user-1',
    entity_type: ReactionEntityTypes.MODULE,
    entity_id: entityId,
    kind: REACTION_KIND_COOL,
    created_at: '2026-06-19T00:00:00Z'
  };
}

describe('CoolButtonDataService', () => {
  function build(enabled: boolean, backendOverrides: Partial<BackendStub> = {}) {
    const backend: BackendStub = {
      get: {
        currentUserReactions: jasmine.createSpy('currentUserReactions').and.returnValue(of([])),
        reactionCount: jasmine.createSpy('reactionCount').and.returnValue(of(0)),
        ...backendOverrides.get
      },
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(of(null)),
        ...backendOverrides.add
      },
      delete: {
        reaction: jasmine.createSpy('deleteReaction').and.returnValue(of(null)),
        ...backendOverrides.delete
      }
    };
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        CoolButtonDataService,
        {provide: COOL_REACTIONS_ENABLED, useValue: enabled},
        {provide: SupabaseService, useValue: backend},
        {provide: MatSnackBar, useValue: snackBar}
      ]
    });

    return {
      service: TestBed.inject(CoolButtonDataService),
      backend,
      snackBar
    };
  }

  it('does not call Cool backend methods when the feature flag is off', () => {
    const {service, backend} = build(false);

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();

    expect(service.vm$.value.visible).toBeFalse();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();
    expect(backend.add.reaction).not.toHaveBeenCalled();
    expect(backend.delete.reaction).not.toHaveBeenCalled();
  });

  it('does not call Cool backend methods when the entity is ineligible', () => {
    const {service, backend} = build(true);

    service.setEntity({
      entityType: ReactionEntityTypes.RACK,
      entityId: 7,
      eligible: false,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();

    expect(service.vm$.value.visible).toBeFalse();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();
    expect(backend.add.reaction).not.toHaveBeenCalled();
    expect(backend.delete.reaction).not.toHaveBeenCalled();
  });

  it('loads current state and count when enabled', () => {
    const {service, backend} = build(true, {
      get: {
        currentUserReactions: jasmine.createSpy('currentUserReactions').and.returnValue(of([makeReaction(42)])),
        reactionCount: jasmine.createSpy('reactionCount').and.returnValue(of(3))
      }
    });

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });

    expect(backend.get.currentUserReactions).toHaveBeenCalledWith(ReactionEntityTypes.MODULE, REACTION_KIND_COOL);
    expect(backend.get.reactionCount).toHaveBeenCalledWith(ReactionEntityTypes.MODULE, 42, REACTION_KIND_COOL);
    expect(service.vm$.value).toEqual(jasmine.objectContaining({
      visible: true,
      active: true,
      count: 3,
      label: 'Cool'
    }));
  });

  it('optimistically toggles and rolls back when a Cool add fails', () => {
    const addResult$ = new Subject<unknown>();
    const {service, backend, snackBar} = build(true, {
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(addResult$)
      }
    });

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();

    expect(service.vm$.value.active).toBeTrue();
    expect(service.vm$.value.count).toBe(1);
    expect(backend.add.reaction).toHaveBeenCalledWith(ReactionEntityTypes.MODULE, 42, REACTION_KIND_COOL);

    addResult$.error(new Error('missing relation'));

    expect(service.vm$.value.active).toBeFalse();
    expect(service.vm$.value.count).toBe(0);
    expect(snackBar.open).toHaveBeenCalledWith('Cool update failed — try again.', undefined, jasmine.any(Object));
  });

  it('re-enables the control after a successful Cool toggle so it can be removed', () => {
    const addResult$ = new Subject<unknown>();
    const deleteResult$ = new Subject<unknown>();
    const {service, backend} = build(true, {
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(addResult$)
      },
      delete: {
        reaction: jasmine.createSpy('deleteReaction').and.returnValue(deleteResult$)
      }
    });

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();
    expect(service.vm$.value.disabled).toBeTrue();

    addResult$.next(null);
    addResult$.complete();

    expect(service.vm$.value).toEqual(jasmine.objectContaining({
      active: true,
      disabled: false,
      count: 1
    }));

    service.requestToggle$.next();

    expect(service.vm$.value).toEqual(jasmine.objectContaining({
      active: false,
      disabled: true,
      count: 0
    }));
    expect(backend.delete.reaction).toHaveBeenCalledWith(ReactionEntityTypes.MODULE, 42, REACTION_KIND_COOL);

    deleteResult$.next(null);
    deleteResult$.complete();

    expect(service.vm$.value).toEqual(jasmine.objectContaining({
      active: false,
      disabled: false,
      count: 0
    }));
  });

  it('hides the control if enabled loading unexpectedly fails', () => {
    const {service, snackBar} = build(true, {
      get: {
        currentUserReactions: jasmine.createSpy('currentUserReactions').and.returnValue(throwError(() => new Error('missing relation'))),
        reactionCount: jasmine.createSpy('reactionCount').and.returnValue(of(0))
      }
    });

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });

    expect(service.vm$.value.visible).toBeFalse();
    expect(service.vm$.value.disabled).toBeTrue();
    expect(snackBar.open).toHaveBeenCalledWith('Cool state could not be loaded.', undefined, jasmine.any(Object));
  });

  it('does not call Cool backend methods when eligibility flips off before inputs settle', () => {
    const {service, backend} = build(true);

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: false,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();

    expect(service.vm$.value.visible).toBeFalse();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();
    expect(backend.add.reaction).not.toHaveBeenCalled();
    expect(backend.delete.reaction).not.toHaveBeenCalled();
  });

  it('does not call Cool backend methods for undefined entity inputs', () => {
    const {service, backend} = build(true);

    service.setEntity({
      entityType: undefined as never,
      entityId: undefined as never,
      eligible: true,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();

    expect(service.vm$.value.visible).toBeFalse();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();
    expect(backend.add.reaction).not.toHaveBeenCalled();
    expect(backend.delete.reaction).not.toHaveBeenCalled();
  });

  it('normalizes undefined component inputs to a no-op hidden state', () => {
    const {service, backend} = build(true);

    service.setEntity({
      entityType: undefined as never,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });

    expect(service.vm$.value.visible).toBeFalse();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();
  });

  it('does not replay stale eligibility after a successful toggle', () => {
    const addResult$ = new Subject<unknown>();
    const {service, backend} = build(true, {
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(addResult$)
      }
    });

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();
    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: false,
      countDisplayMode: 'count'
    });
    addResult$.next(null);
    addResult$.complete();

    expect(service.vm$.value.visible).toBeFalse();
    expect(backend.get.currentUserReactions).toHaveBeenCalledTimes(1);
    expect(backend.get.reactionCount).toHaveBeenCalledTimes(1);
  });

  it('does not roll back to a stale visible state after eligibility changes and a toggle fails', () => {
    const addResult$ = new Subject<unknown>();
    const {service} = build(true, {
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(addResult$)
      }
    });

    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: true,
      countDisplayMode: 'count'
    });
    service.requestToggle$.next();
    service.setEntity({
      entityType: ReactionEntityTypes.MODULE,
      entityId: 42,
      eligible: false,
      countDisplayMode: 'count'
    });
    addResult$.error(new Error('missing relation'));

    expect(service.vm$.value.visible).toBeFalse();
  });
});

describe('CoolButtonComponent', () => {
  let fixture: ComponentFixture<CoolButtonComponent>;

  function build(enabled: boolean, eligible = true, count = 2) {
    const backend: BackendStub = {
      get: {
        currentUserReactions: jasmine.createSpy('currentUserReactions').and.returnValue(of([])),
        reactionCount: jasmine.createSpy('reactionCount').and.returnValue(of(count))
      },
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(of(null))
      },
      delete: {
        reaction: jasmine.createSpy('deleteReaction').and.returnValue(of(null))
      }
    };

    TestBed.configureTestingModule({
      imports: [CommonModule, NoopAnimationsModule, CoolButtonComponent],
      providers: [
        {provide: COOL_REACTIONS_ENABLED, useValue: enabled},
        {provide: SupabaseService, useValue: backend},
        {provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])}
      ]
    });

    fixture = TestBed.createComponent(CoolButtonComponent);
    fixture.componentRef.setInput('entityType', ReactionEntityTypes.MODULE);
    fixture.componentRef.setInput('entityId', 42);
    if (eligible) {
      fixture.componentRef.setInput('eligible', true);
    }
    fixture.detectChanges();

    return {backend};
  }

  it('renders nothing when the feature flag is off', () => {
    const {backend} = build(false);

    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();
  });

  it('renders nothing before eligibility is explicitly enabled', () => {
    const {backend} = build(true, false);

    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
    expect(backend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(backend.get.reactionCount).not.toHaveBeenCalled();
  });

  it('renders the enabled Cool control with aggregate count', () => {
    build(true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.coolButton')).nativeElement as HTMLButtonElement;
    const count = fixture.debugElement.query(By.css('.coolButton__count')).nativeElement as HTMLElement;
    expect(button.textContent).toContain('Cool');
    expect(count.textContent?.trim()).toBe('2');
    expect(count.getAttribute('aria-label')).toBe('2 cool reactions');
    expect(button.getAttribute('aria-label')).toBe('Mark as cool');
  });

  it('does not reserve count badge space before a count exists', () => {
    build(true, true, 0);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.coolButton__count'))).toBeNull();
  });

  it('plays a short burst only for enabled Cool clicks', fakeAsync(() => {
    build(true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.coolButton'));
    button.triggerEventHandler('click');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button.coolButton--burst'))).not.toBeNull();

    tick(1050);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button.coolButton--burst'))).toBeNull();
  }));

  it('restarts the burst for repeated clicks before the previous burst reset finishes', fakeAsync(() => {
    build(true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.coolButton'));
    button.triggerEventHandler('click');
    fixture.detectChanges();
    expect(fixture.componentInstance.bursting).toBeTrue();

    tick(400);
    button.triggerEventHandler('click');
    fixture.detectChanges();
    tick(640);
    fixture.detectChanges();

    expect(fixture.componentInstance.bursting).toBeTrue();

    tick(410);
    fixture.detectChanges();

    expect(fixture.componentInstance.bursting).toBeFalse();
  }));
});
