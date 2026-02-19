import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatCardTitle } from "@angular/material/card";
import { MatIcon } from "@angular/material/icon";
import { BrandPrimaryButtonModule } from "src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module";


@Component({
  selector: 'lib-faq',
  imports: [
    MatCardTitle,
    MatIcon,
    BrandPrimaryButtonModule
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