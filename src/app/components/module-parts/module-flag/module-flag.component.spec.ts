import { BehaviorSubject, Subject } from 'rxjs';
import { ModuleFlagComponent } from './module-flag.component';


function makeComponent() {
  const flagService = {
    moduleId$: new Subject<number>(),
    toggleForm$: new Subject<void>(),
    submitFlag$: new Subject<{category: string; note: string}>(),
    formVisible$: new BehaviorSubject<boolean>(false),
    openFlagCount$: new BehaviorSubject<number>(0)
  };
  const userService = {
    loggedUser$: new BehaviorSubject({id: 'user-1'})
  };

  const component = new ModuleFlagComponent(flagService as any, userService as any);

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
});
