import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { HomeWorkflowStep } from '../../home-content.models';
import { buildHomeTextSegments } from '../../home-text-segments.util';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-workflow-rail',
  templateUrl: './home-workflow-rail.component.html',
  styleUrls: ['./home-workflow-rail.component.scss'],
  standalone: false
})
export class HomeWorkflowRailComponent {
  @Input() sectionTitle = '';
  @Input() sectionIntro = '';
  @Input() steps: HomeWorkflowStep[] = [];
  
  getStepDescriptionSegments(step: HomeWorkflowStep) {
    return buildHomeTextSegments(step.description, step.keywords ?? []);
  }
}