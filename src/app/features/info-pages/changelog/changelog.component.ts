import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';


@Component({
  selector: 'app-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ChangelogComponent {
  readonly changelogUrl = 'https://github.com/Polyterative/Patcher/blob/develop/CHANGELOG.md';
  readonly roadmapUrl = 'https://github.com/Polyterative/Patcher/blob/develop/internaldocs/workflow/TODO.md';
  readonly repoUrl = 'https://github.com/Polyterative/Patcher';
  readonly issueTrackerUrl = 'https://github.com/Polyterative/Patcher/issues';

  constructor(
    private readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    this.seoAndUtilsService.updateSeo(
      {
        title: 'Patcher changelog',
        description: 'Release notes, roadmap links, and project update paths for Patcher.',
        url: 'https://patcher.xyz/info/changelog',
      },
      'Patcher changelog'
    );
  }
}
