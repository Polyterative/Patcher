import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  EventEmitter,
  Injectable,
  OnDestroy
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject
} from 'rxjs';
import {
  filter,
  map,
  tap,
  withLatestFrom
} from 'rxjs/operators';


type FileArray = File[];

export interface FileDragHostAddEvent {
  addedFiles: FileArray;
  rejectedFiles: FileArray;
}

@Injectable()
export class FileDragHostService extends SubManager implements OnDestroy {
  
  readonly fileAdd$: EventEmitter<FileDragHostAddEvent> = new EventEmitter<FileDragHostAddEvent>();
  readonly files$: BehaviorSubject<FileArray> = new BehaviorSubject<FileArray>([]);
  readonly removeFile$: EventEmitter<File> = new EventEmitter<File>();
  readonly removeAllFiles$: EventEmitter<void> = new EventEmitter<void>();
  readonly singleFileMode$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private snackBar: MatSnackBar) {
    super();

    this.setupFileAdder();

    this.removeAllFiles$
        .pipe(this.takeUntilDestroyed())
        .subscribe(_ => {
          this.files$.next([]);
        });
  }


  addFiles(files: FileList | FileArray, acceptedFileType?: string): void {
    const addedFiles: FileArray = [];
    const rejectedFiles: FileArray = [];

    Array.from(files).forEach(file => {
      if (this.isAcceptedFile(file, acceptedFileType)) {
        addedFiles.push(file);
      } else {
        rejectedFiles.push(file);
      }
    });

    this.fileAdd$.emit({ addedFiles, rejectedFiles });
  }

  private setupFileAdder(): void {
    this.removeFile$
        .pipe(this.takeUntilDestroyed())
        .pipe(
          withLatestFrom(this.files$),
          map(([deleted, files]) => {

            return files.filter(file => file !== deleted);
          })
        )
        .subscribe(x => this.files$.next(x));

    this.fileAdd$
        .pipe(
          filter(x => !!x.addedFiles),
          tap(x => {
            if ((x.rejectedFiles?.length ?? 0) > 0 || x.addedFiles.length === 0) {
              this.snackBar.open('File not accepted — check the format and try again.', undefined, {duration: 8000, panelClass: 'snack-error'});
            }
          }),
          map(x => x.addedFiles),
          withLatestFrom(this.files$),
          filter(([newFiles]) => newFiles.length > 0),
          map(([newFiles, oldPool]) => {
            if (this.singleFileMode$.value) {
              // override old pool with new files, if single file mode is active
              return [newFiles[0]];
            } else {
              return oldPool.concat(newFiles);
            }
          }),
          this.takeUntilDestroyed()
        )
        .subscribe(x => this.files$.next(x));


  }

  private isAcceptedFile(file: File, acceptedFileType?: string): boolean {
    const acceptList = (acceptedFileType ?? '')
        .split(',')
        .map(type => type.trim().toLowerCase())
        .filter(type => type.length > 0);

    if (acceptList.length === 0) {
      return true;
    }

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    return acceptList.some(type => {
      if (type.startsWith('.')) {
        return fileName.endsWith(type);
      }

      if (type.endsWith('/*')) {
        return fileType.startsWith(type.slice(0, -1));
      }

      return fileType === type;
    });
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();

  }

}
