import {
  EventEmitter,
  Injectable,
  OnDestroy
}                                 from '@angular/core';
import { MatSnackBar }            from '@angular/material/snack-bar';
import { NgxDropzoneChangeEvent } from 'ngx-dropzone';
import {
  BehaviorSubject,
  Subject
}                                 from 'rxjs';
import {
  filter,
  map,
  takeUntil,
  tap,
  withLatestFrom
}                                 from 'rxjs/operators';

type FileArray = File[];

@Injectable()
export class FileDragHostService implements OnDestroy {

  readonly fileAdd$: EventEmitter<NgxDropzoneChangeEvent> = new EventEmitter<NgxDropzoneChangeEvent>();
  readonly files$: BehaviorSubject<FileArray> = new BehaviorSubject<FileArray>([]);
  readonly removeFile$: EventEmitter<File> = new EventEmitter<File>();
  readonly removeAllFiles$: EventEmitter<void> = new EventEmitter<void>();

  constructor(private snackBar: MatSnackBar) {

    this.setupFileAdder();

    this.removeAllFiles$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(_ => {
          this.files$.next([]);
        });
  }


  private setupFileAdder(): void {
    this.removeFile$
        .pipe(takeUntil(this.destroyEvent$))
        .pipe(
          withLatestFrom(this.files$),
          map(([deteled, files]) => {

            files.splice(files.indexOf(deteled), 1);
            return files;
          })
        )
        .subscribe(x => this.files$.next(x));

    this.fileAdd$
        .pipe(
          filter(x => !!x.addedFiles),
          map(x => x.addedFiles),
          withLatestFrom(this.files$),
          tap(([newFiles, oldPool]) => {
            if (newFiles.length === 0) {
              this.snackBar.open('💔 File non valido, riprova', undefined, {duration: 8000});
            }
          }),
          filter(([newFiles, oldPool]) => newFiles.length > 0),
          map(([newFiles, oldPool]) => oldPool.concat(newFiles)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.files$.next(x));


  }
  
  protected destroyEvent$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();

  }

}
