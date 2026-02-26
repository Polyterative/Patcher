import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatButton } from "@angular/material/button";
import { MatCardTitle } from "@angular/material/card";
import { MatIcon } from "@angular/material/icon";


@Component({
  selector: 'lib-faq',
  imports: [
    MatButton,
    MatCardTitle,
    MatIcon,
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