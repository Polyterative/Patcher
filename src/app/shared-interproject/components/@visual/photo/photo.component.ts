import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { PhotosService } from 'src/app/shared-interproject/components/@visual/photo/photos.service';

@Component({
  selector:        'lib-photo',
  templateUrl:     './photo.component.html',
  styleUrls:       ['./photo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [PhotosService]
})
export class PhotoComponent {
  @Input()
  set path(path: string) {
    this.dataService.url$.next(path);
  };
  
  @Input() theme: 'title' | 'mid' | 'sm' | 'clean' = 'clean';
  
  constructor(
    public dataService: PhotosService,
    public appState: AppStateService
  ) { }
}
