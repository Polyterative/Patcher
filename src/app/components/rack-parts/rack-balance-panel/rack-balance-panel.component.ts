import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { RackedModule } from 'src/app/models/module';
import {
  RackBalanceAnalysisResult,
  RackBalanceAnalysisService
} from '../rack-balance-analysis.service';

@Component({
  selector: 'app-rack-balance-panel',
  templateUrl: './rack-balance-panel.component.html',
  styleUrls: ['./rack-balance-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackBalancePanelComponent {
  private readonly rowedRackedModules$ = new ReplaySubject<RackedModule[][] | null | undefined>(1);

  readonly analysis$ = this.rowedRackedModules$.pipe(
    map(rowedRackedModules => this.analysisService.analyze(rowedRackedModules))
  );

  @Input() set rowedRackedModules(value: RackedModule[][] | null | undefined) {
    this.rowedRackedModules$.next(value);
  }

  constructor(
    private readonly analysisService: RackBalanceAnalysisService
  ) {}

  confidencePercent(analysis: RackBalanceAnalysisResult): number {
    return Math.round(analysis.confidence * 100);
  }
}
