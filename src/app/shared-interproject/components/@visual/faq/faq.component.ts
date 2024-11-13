import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  NgForOf,
  NgIf
} from "@angular/common";
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelTitle
} from "@angular/material/expansion";
import { MatCardTitle } from "@angular/material/card";
import { MatIcon } from "@angular/material/icon";
import { MatButton } from "@angular/material/button";


@Component({
  selector: 'lib-faq',
  standalone: true,
  imports: [
    NgForOf,
    MatExpansionPanelDescription,
    MatExpansionPanelTitle,
    MatAccordion,
    MatExpansionPanel,
    MatCardTitle,
    MatIcon,
    NgIf,
    MatButton,
  ],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FaqComponent {
  @Input() data: {
    question: string;
    answer: string;
    icon?: string;
    link?: string;
  }[] = [];
}
