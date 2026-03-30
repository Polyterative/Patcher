import { ElementRef } from '@angular/core';
import { DiscoveryTipAnchorDirective } from './discovery-tip-anchor.directive';


describe('DiscoveryTipAnchorDirective', () => {
  it('registers its anchor on init', () => {
    const element = document.createElement('div');
    const discoveryTipService = jasmine.createSpyObj('DiscoveryTipService', ['registerAnchor', 'unregisterAnchor']);
    const directive = new DiscoveryTipAnchorDirective(new ElementRef(element), discoveryTipService);
    directive.anchorId = 'user-area-modules-add';

    directive.ngOnInit();

    expect(discoveryTipService.registerAnchor).toHaveBeenCalledWith('user-area-modules-add', element);
  });

  it('unregisters its anchor on destroy', () => {
    const element = document.createElement('div');
    const discoveryTipService = jasmine.createSpyObj('DiscoveryTipService', ['registerAnchor', 'unregisterAnchor']);
    const directive = new DiscoveryTipAnchorDirective(new ElementRef(element), discoveryTipService);
    directive.anchorId = 'user-area-modules-add';

    directive.ngOnDestroy();

    expect(discoveryTipService.unregisterAnchor).toHaveBeenCalledWith('user-area-modules-add', element);
  });
});
