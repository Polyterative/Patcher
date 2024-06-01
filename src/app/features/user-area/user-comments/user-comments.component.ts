import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';


@Component({
  selector: 'app-user-comments',
  standalone: true,
  imports: [],
  templateUrl: './user-comments.component.html',
  styleUrl: './user-comments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCommentsComponent {

}