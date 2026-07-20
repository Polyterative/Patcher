import {
  BehaviorSubject,
  ReplaySubject,
  Subject
} from 'rxjs';
import { SimpleChange } from '@angular/core';
import { SimpleUserModel } from 'src/app/features/backend/supabase.types';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { ModuleFlagComponent } from './module-flag.component';
import {
  FlagPayload,
  ModuleFlagDataService
} from './module-flag-data.service';

type ModuleFlagDataServiceDouble = Pick<
  ModuleFlagDataService,
  'moduleId$' | 'toggleForm$' | 'submitFlag$' | 'formVisible$' | 'openFlagCount$'
>;
type UserManagementServiceDouble = Pick<UserManagementService, 'loggedUser$'>;

function simpleUserFixture(): SimpleUserModel {
  return {
    id: 'user-1',
    email: 'user@example.com',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  };
}

function makeComponent() {
  const flagService: ModuleFlagDataServiceDouble = {
    moduleId$: new ReplaySubject<number>(1),
    toggleForm$: new Subject<void>(),
    submitFlag$: new Subject<FlagPayload>(),
    formVisible$: new BehaviorSubject<boolean>(false),
    openFlagCount$: new BehaviorSubject<number>(0)
  };
  const userService: UserManagementServiceDouble = {
    loggedUser$: new BehaviorSubject<SimpleUserModel | undefined>(simpleUserFixture())
  };

  const component = new ModuleFlagComponent(
    flagService as ModuleFlagDataService,
    userService as UserManagementService
  );

  return {component, flagService};
}

describe('ModuleFlagComponent', () => {
  it('shows only the issue options for the selected problem area', () => {
    const {component} = makeComponent();

    component.selectGroup('Specs and setup');

    expect(component.selectedGroupOptions.map(option => option.value)).toEqual([
      'wrong-hp',
      'wrong-power',
      'wrong-depth-weight',
      'wrong-io'
    ]);
  });

  it('clears the specific issue when the problem area changes', () => {
    const {component} = makeComponent();

    component.selectGroup('Module details');
    component.selectedCategory = 'wrong-name';

    component.selectGroup('Images and links');

    expect(component.selectedCategory).toBe('');
    expect(component.selectedGroupLabel).toBe('Images and links');
  });

  it('submits the selected issue from the submit form', () => {
    const {component, flagService} = makeComponent();
    const payloads: Array<{category: string; note: string}> = [];
    flagService.submitFlag$.subscribe(payload => payloads.push(payload));

    component.selectGroup('Specs and setup');
    component.selectCategory('wrong-power');
    component.flagNote = 'Only +12V is used.';

    component.submitFlag();

    expect(payloads).toEqual([{category: 'wrong-power', note: 'Only +12V is used.'}]);
    expect(component.selectedGroupLabel).toBe('');
    expect(component.selectedCategory).toBe('');
    expect(component.flagNote).toBe('');
  });

  it('resets the submit form when cancelled', () => {
    const {component, flagService} = makeComponent();
    let toggleCount = 0;
    flagService.toggleForm$.subscribe(() => toggleCount++);

    component.selectGroup('Images and links');
    component.selectCategory('missing-manual');
    component.flagNote = 'Manual link is gone.';

    component.cancelFlag();

    expect(toggleCount).toBe(1);
    expect(component.selectedGroupLabel).toBe('');
    expect(component.selectedCategory).toBe('');
    expect(component.flagNote).toBe('');
  });

  it('exposes the selected issue label for contextual helper copy', () => {
    const {component} = makeComponent();

    component.selectGroup('Specs and setup');
    component.selectCategory('wrong-power');

    expect(component.selectedCategoryLabel).toBe('Wrong power requirements');
  });

  it('does not emit submitFlag$ when no category is selected', () => {
    const {component, flagService} = makeComponent();
    let emitted = false;
    flagService.submitFlag$.subscribe(() => emitted = true);

    component.submitFlag();

    expect(emitted).toBeFalse();
  });

  it('ngOnChanges pushes moduleId into flagService.moduleId$', () => {
    const {component, flagService} = makeComponent();
    const received: number[] = [];
    flagService.moduleId$.subscribe(id => received.push(id));

    component.moduleId = 42;
    component.ngOnChanges({ moduleId: new SimpleChange(undefined, 42, true) });

    expect(received).toEqual([42]);
  });

  it('selectedGroupOptions returns empty array before a group is selected', () => {
    const {component} = makeComponent();
    expect(component.selectedGroupOptions).toEqual([]);
  });

  it('selectedGroup returns undefined before any group is selected', () => {
    const {component} = makeComponent();
    expect(component.selectedGroup).toBeUndefined();
  });

  it('selectedCategoryLabel returns empty string when no category is selected', () => {
    const {component} = makeComponent();
    component.selectGroup('Specs and setup');
    expect(component.selectedCategoryLabel).toBe('');
  });
});
