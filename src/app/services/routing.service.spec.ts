import { RoutingService } from './routing.service';


describe('RoutingService', () => {
  function build() {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    return {service: new RoutingService(router), router};
  }
  
  it('navigates to given paths via router.navigate', () => {
    const {service, router} = build();
    service.routeTo(['/modules', 'details', '42']);
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'details', '42']);
  });
  
  it('navigates to empty paths array', () => {
    const {service, router} = build();
    service.routeTo([]);
    expect(router.navigate).toHaveBeenCalledWith([]);
  });
  
  it('openInNewTab calls window.open with _blank target and focuses', () => {
    const {service} = build();
    const mockWindow = {focus: jasmine.createSpy('focus')};
    spyOn(window, 'open').and.returnValue(mockWindow as any);
    service.openInNewTab('https://patcher.xyz/modules/details/1');
    expect(window.open).toHaveBeenCalledWith('https://patcher.xyz/modules/details/1', '_blank');
    expect(mockWindow.focus).toHaveBeenCalled();
  });
});