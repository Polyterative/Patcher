import { Meta, Title } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { LegacyLinkGonePageComponent } from './legacy-link-gone-page.component';
import { UserManagementService } from '../login/user-management.service';
import {
  RichUserModel,
  SimpleUserModel
} from '../../backend/supabase.service';


describe('LegacyLinkGonePageComponent', () => {
  function build(user: SimpleUserModel | undefined = undefined, username?: string) {
    const loggedUser$ = new BehaviorSubject<SimpleUserModel | undefined>(user);
    const loggedUserFullProfile$ = new BehaviorSubject<RichUserModel | undefined>(
      username
        ? {
          id: user?.id ?? 'user-1',
          email: user?.email ?? 'ada@example.com',
          created_at: user?.created_at ?? '2026-01-01T00:00:00.000Z',
          updated_at: user?.updated_at ?? '2026-01-01T00:00:00.000Z',
          username,
          avatar_url: null,
          public: true,
          website: null
        }
        : undefined
    );
    const meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag']);
    const title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    const userService = jasmine.createSpyObj<UserManagementService>('UserManagementService', [], {
      loggedUser$: loggedUser$.asObservable(),
      loggedUserFullProfile$: loggedUserFullProfile$.asObservable()
    });
    const component = new LegacyLinkGonePageComponent(meta, title, userService);
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
    const {component} = build({
      id: 'user-1',
      email: 'ada@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }, 'ada');

    component.profileLink$.subscribe(link => {
      expect(link).toEqual(['/u', 'ada']);
      done();
    });
  });
});
