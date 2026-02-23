import { ModuleBrowserDetailComponent } from './module-browser-detail.component';


describe('ModuleBrowserDetailComponent', () => {
  function createComponent(): ModuleBrowserDetailComponent {
    return new ModuleBrowserDetailComponent(
      {} as any,
      {} as any,
      {} as any,
      {updateSeo: () => undefined} as any,
      {} as any,
      {} as any,
      {} as any
    );
  }
  
  it('should keep "Others by" tags read-only', () => {
    const component = createComponent();
    
    expect(component.bySameManufacturerViewConfig.tagsReadOnly).toBeTrue();
  });
  
  it('should hide tag vote counts in "Others by"', () => {
    const component = createComponent();
    
    expect(component.bySameManufacturerViewConfig.tagsShowCounts).toBeFalse();
  });
  
  it('should cap "Others by" tags to five', () => {
    const component = createComponent();
    
    expect(component.bySameManufacturerViewConfig.tagsMaxCount).toBe(5);
  });
});