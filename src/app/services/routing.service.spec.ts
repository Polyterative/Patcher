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

  it('routeTo delegates a single path segment correctly', () => {
    const {service, router} = build();
    service.routeTo(['/modules']);
    expect(router.navigate).toHaveBeenCalledWith(['/modules']);
  });

  describe('token-aware entity links', () => {
    it('builds rack router links with public_id preference and legacy fallback', () => {
      const {service} = build();
      expect(service.linkToRack({id: 5, public_id: 'aBcD1234_-Xy'})).toEqual(['/racks', 'aBcD1234_-Xy']);
      expect(service.linkToRack({id: 5})).toEqual(['/racks', 'details', 5]);
      expect(service.linkToRack(null)).toEqual(['/racks']);
    });

    it('builds patch router links with public_id preference and legacy fallback', () => {
      const {service} = build();
      expect(service.linkToPatch({id: 5, public_id: 'zYxW9876_-Ab'})).toEqual(['/patches', 'zYxW9876_-Ab']);
      expect(service.linkToPatch({id: 5})).toEqual(['/patches', 'details', 5]);
      expect(service.linkToPatch(null)).toEqual(['/patches']);
    });

    it('builds rack paths with public_id preference and legacy fallback', () => {
      const {service} = build();
      expect(service.rackPathFor({id: 5, public_id: 'aBcD1234_-Xy'})).toBe('/racks/aBcD1234_-Xy');
      expect(service.rackPathFor({id: 5})).toBe('/racks/details/5');
      expect(service.rackPathFor(null)).toBe('/racks');
    });

    it('builds patch paths with public_id preference and legacy fallback', () => {
      const {service} = build();
      expect(service.patchPathFor({id: 5, public_id: 'zYxW9876_-Ab'})).toBe('/patches/zYxW9876_-Ab');
      expect(service.patchPathFor({id: 5})).toBe('/patches/details/5');
      expect(service.patchPathFor(null)).toBe('/patches');
    });
  });

});