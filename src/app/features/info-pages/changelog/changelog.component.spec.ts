import { ChangelogComponent } from './changelog.component';

describe('ChangelogComponent', () => {
  let comp: ChangelogComponent;
  let mockSeoService: { updateSeo: jasmine.Spy };

  beforeEach(() => {
    mockSeoService = { updateSeo: jasmine.createSpy('updateSeo') };
    comp = new ChangelogComponent(mockSeoService as any);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('calls seoAndUtilsService.updateSeo in constructor', () => {
    expect(mockSeoService.updateSeo).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ title: 'Patcher changelog' }),
      'Patcher changelog'
    );
  });

  it('changelogUrl points to GitHub CHANGELOG.md', () => {
    expect(comp.changelogUrl).toContain('CHANGELOG.md');
  });

  it('roadmapUrl points to ROADMAP.md', () => {
    expect(comp.roadmapUrl).toContain('ROADMAP.md');
  });

  it('repoUrl points to GitHub repo', () => {
    expect(comp.repoUrl).toContain('github.com/Polyterative/Patcher');
  });

  it('issueTrackerUrl points to GitHub issues', () => {
    expect(comp.issueTrackerUrl).toContain('/issues');
  });
});
