import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { FaqComponent } from "src/app/shared-interproject/components/@visual/faq/faq.component";
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";


@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    FaqComponent,
    HeroContentCardModule
  ],
  templateUrl: './app-faq.component.html',
  styleUrl: './app-faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppFaqComponent {
  
  faq = [
    {
      question: 'What is the purpose of this project?',
      icon: 'info',
      answer: 'Patcher aims to be the most comprehensive manager and database for modular gear, providing free access to public data. The project is open-source and available to everyone for free.'
    },
    {
      question: 'How can I add missing modules?',
      icon: 'add_circle',
      link: 'https://patcher.xyz/modules/add',
      answer: 'If you notice a missing module, you can add it yourself using the "Submit New Module" button located in the modules section at the top right of the page.'
    },
    {
      question: 'How can I add missing panel images?',
      icon: 'image',
      answer: 'If panel images are missing for a module, you can upload them directly via the module’s detail page. Just navigate to the module page, and you’ll find the option to add images there.'
    },
    {
      question: 'Can data from ModularGrid be imported?',
      icon: 'cloud_upload',
      answer: 'Currently, direct importing of data from ModularGrid is not supported. ModularGrid has stated it does not intend to provide support for this project. However, you can manually add any module or rack through the website.'
    },
    {
      question: 'How can I suggest a feature?',
      icon: 'lightbulb',
      link: 'https://discord.com/invite/JNy2HTb5ru',
      answer: 'To suggest a feature, join our Discord server for discussions, or if it’s a technical suggestion, you can submit an issue on our GitHub repository. The link is available in the footer.'
    },
    {
      question: 'How can I contribute to the project?',
      icon: 'volunteer_activism',
      link: 'https://www.patreon.com/c/patcher',
      answer: 'There are many ways you can contribute to the project, including development, documentation, or data entry. You can also help by sharing the project with your friends and spreading the word. Direct support via Patreon is available.'
    },
    {
      question: 'How can I report a bug?',
      icon: 'bug_report',
      link: 'https://github.com/Polyterative/Patcher',
      answer: 'If you encounter a bug, report it on our Discord server or submit an issue on our GitHub repository.'
    },
    {
      question: 'What is being developed right now?',
      icon: 'build',
      link: 'https://polyterative.notion.site/7139ace262ad48a59e560bff76722a63?v=756abbb3f1494894a2a0f6f53bc7e8e1',
      answer: 'We are constantly improving the project. You can check the roadmap on our GitHub repository to see what is currently being developed. Or click the link below to see our Notion page.'
    }
  ]
  
}
