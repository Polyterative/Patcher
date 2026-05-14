import { ToolbarService, ToolbarPrimaryIcon } from './toolbar.service';

describe('ToolbarService', () => {
  let service: ToolbarService;

  beforeEach(() => {
    service = new ToolbarService();
  });

  it('title starts as patcher.xyz', () => {
    expect(service.state.title.getValue()).toBe('patcher.xyz');
  });

  it('toolbarVisible$ starts as true', () => {
    expect(service.state.toolbarVisible$.getValue()).toBe(true);
  });

  it('state title can be updated', () => {
    service.state.title.next('new title');
    expect(service.state.title.getValue()).toBe('new title');
  });
});

describe('ToolbarPrimaryIcon', () => {
  it('defines ADD icon', () => {
    expect(ToolbarPrimaryIcon.ADD).toBe('add');
  });

  it('defines SEARCH icon', () => {
    expect(ToolbarPrimaryIcon.SEARCH).toBe('search');
  });

  it('defines SAVE icon', () => {
    expect(ToolbarPrimaryIcon.SAVE).toBe('save');
  });
});
