import { MatSnackBar } from '@angular/material/snack-bar';
import { FileDragHostAddEvent, FileDragHostService } from './file-drag-host.service';

describe('FileDragHostService', () => {
  let service: FileDragHostService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function makeFile(name: string): File {
    return new File([''], name, {type: 'image/png'});
  }

  function dropEvent(files: File[], rejectedFiles: File[] = []): FileDragHostAddEvent {
    return {addedFiles: files, rejectedFiles};
  }

  beforeEach(() => {
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    service = new FileDragHostService(snackBar);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('starts with an empty files$ pool', () => {
    expect(service.files$.value).toEqual([]);
  });

  it('adds files to the pool when fileAdd$ emits non-empty addedFiles', () => {
    const a = makeFile('a.png');
    const b = makeFile('b.png');

    service.fileAdd$.emit(dropEvent([a, b]));

    expect(service.files$.value).toEqual([a, b]);
  });

  it('appends subsequent files to the existing pool in multi-file mode', () => {
    const a = makeFile('a.png');
    const b = makeFile('b.png');

    service.fileAdd$.emit(dropEvent([a]));
    service.fileAdd$.emit(dropEvent([b]));

    expect(service.files$.value).toEqual([a, b]);
  });

  it('replaces pool with first new file only when singleFileMode$ is true', () => {
    const a = makeFile('a.png');
    const b = makeFile('b.png');

    service.singleFileMode$.next(true);
    service.fileAdd$.emit(dropEvent([a]));
    service.fileAdd$.emit(dropEvent([b]));

    expect(service.files$.value).toEqual([b]);
  });

  it('shows snackbar error and does not update files$ when addedFiles is empty', () => {
    service.fileAdd$.emit(dropEvent([]));

    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('File not accepted'),
      undefined,
      jasmine.anything()
    );
    expect(service.files$.value).toEqual([]);
  });

  it('validates files against accept strings before adding them', () => {
    const png = makeFile('a.png');
    const text = new File([''], 'notes.txt', {type: 'text/plain'});

    service.addFiles([png, text], 'image/*');

    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('File not accepted'),
      undefined,
      jasmine.anything()
    );
    expect(service.files$.value).toEqual([png]);
  });

  it('does not update files$ when all picked files are rejected', () => {
    const text = new File([''], 'notes.txt', {type: 'text/plain'});

    service.addFiles([text], 'image/*');

    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('File not accepted'),
      undefined,
      jasmine.anything()
    );
    expect(service.files$.value).toEqual([]);
  });

  it('accepts files by extension when the accept string uses an extension', () => {
    const zip = new File([''], 'archive.zip', {type: 'application/octet-stream'});

    service.addFiles([zip], '.zip');

    expect(snackBar.open).not.toHaveBeenCalled();
    expect(service.files$.value).toEqual([zip]);
  });

  it('removeFile$ removes the specified file from the pool', () => {
    const a = makeFile('a.png');
    const b = makeFile('b.png');

    service.fileAdd$.emit(dropEvent([a, b]));
    service.removeFile$.emit(a);

    expect(service.files$.value).toEqual([b]);
  });

  it('removeAllFiles$ clears the entire pool', () => {
    const a = makeFile('a.png');

    service.fileAdd$.emit(dropEvent([a]));
    service.removeAllFiles$.emit();

    expect(service.files$.value).toEqual([]);
  });
});
