import { Meta, Title } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { LegacyLinkGonePageComponent } from './legacy-link-gone-page.component';


describe('LegacyLinkGonePageComponent', () => {
  function build(user: unknown = undefined, username?: string) {
    const loggedUser$ = new BehaviorSubject<unknown>(user);
    const loggedUserFullProfile$ = new BehaviorSubject<{username?: string} | undefined>(username ? {username} : undefined);
    const meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag']);
    const title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    const userService = {
      loggedUser$: loggedUser$.asObservable(),
      loggedUserFullProfile$: loggedUserFullProfile$.asObservable()
    };
    const component = new LegacyLinkGonePageComponent(meta, title, userService as any);
    return {component, loggedUser$, loggedUserFullProfile$, meta, title};
  }

  it('sets noindex metadata', () => {
    const {component, meta, title} = build();

    component.ngOnInit();

    expect(title.setTitle).toHaveBeenCalledWith('Retired Share Link | patcher.xyz');
    expect(meta.updateTag).toHaveBeenCalledWith({name: 'robots', content: 'noindex, nofollow'});
  });

  it('links anonymous users to login', (done) => {
    const {component} = build();

    component.profileLink$.subscribe(link => {
      expect(link).toEqual(['/auth/login']);
      done();
    });
  });

  it('links logged-in users with a handle to their public profile', (done) => {
    const {component} = build({id: 'user-1'}, 'ada');

    component.profileLink$.subscribe(link => {
      expect(link).toEqual(['/u', 'ada']);
      done();
    });
  });
});
