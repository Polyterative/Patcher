import { Subscription } from 'rxjs';
import { SubManager } from './subscription-manager';


describe('SubManager', () => {
  let manager: SubManager;
  
  beforeEach(() => {
    manager = new SubManager();
  });
  
  afterEach(() => {
    manager.ngOnDestroy();
  });
  
  it('adds subscriptions via manageSub', () => {
    const sub = new Subscription();
    manager.manageSub(sub);
    expect((manager as any)._subscriptions.length).toBe(1);
  });
  
  it('manageSub ignores undefined argument', () => {
    manager.manageSub(undefined);
    expect((manager as any)._subscriptions.length).toBe(0);
  });
  
  it('unsubscribeAll closes all tracked subscriptions and clears array', () => {
    const sub1 = new Subscription();
    const sub2 = new Subscription();
    manager.manageSub(sub1);
    manager.manageSub(sub2);
    
    manager.unsubscribeAll();
    
    expect(sub1.closed).toBeTrue();
    expect(sub2.closed).toBeTrue();
    expect((manager as any)._subscriptions.length).toBe(0);
  });
  
  it('ngOnDestroy completes the destroy$ subject', () => {
    let completed = false;
    manager.destroy$.subscribe({complete: () => (completed = true)});
    
    manager.ngOnDestroy();
    
    expect(completed).toBeTrue();
  });
  
  it('ngOnDestroy emits on destroy$ before completing', () => {
    let emitted = false;
    manager.destroy$.subscribe(() => (emitted = true));
    
    manager.ngOnDestroy();
    
    expect(emitted).toBeTrue();
  });
  
  it('unsubscribeArray with emptyArray=false keeps array length', () => {
    const sub1 = new Subscription();
    const arr = [sub1];
    
    manager.unsubscribeArray(arr, false);
    
    expect(sub1.closed).toBeTrue();
    expect(arr.length).toBe(1);
  });
  
  it('unsubscribeArray with emptyArray=true clears array', () => {
    const sub1 = new Subscription();
    const sub2 = new Subscription();
    const arr = [sub1, sub2];
    
    manager.unsubscribeArray(arr, true);
    
    expect(arr.length).toBe(0);
  });
  
  it('skips already-closed subscriptions without throwing', () => {
    const sub = new Subscription();
    sub.unsubscribe();
    manager.manageSub(sub);
    
    expect(() => manager.unsubscribeAll()).not.toThrow();
  });
  
  it('destroy$ subject is re-usable after ngOnDestroy (completed, so new observers receive complete)', () => {
    manager.ngOnDestroy();
    let seenComplete = false;
    manager.destroy$.subscribe({complete: () => (seenComplete = true)});
    // completed subject immediately notifies new subscribers
    expect(seenComplete).toBeTrue();
  });
});