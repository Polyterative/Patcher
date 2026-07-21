import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { PatchConnectionMinimalComponent } from './patch-connection-minimal.component';
import { PatchConnection } from 'src/app/models/connection';
import {
  cvWithModuleFixture,
  patchFixture
} from 'src/app/components/patch-parts/patch-graph/patch-graph-test-fixtures';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConnection(notes?: string): PatchConnection {
  return {
    patch: patchFixture(1, {name: 'Test Patch'}),
    a: cvWithModuleFixture(1, 10, 'ModA', 'In 1'),
    b: cvWithModuleFixture(2, 11, 'ModB', 'Out 1'),
    notes,
  };
}

function makeComponent(data: PatchConnection = makeConnection()): {
  comp: PatchConnectionMinimalComponent;
  cdr: jasmine.SpyObj<ChangeDetectorRef>;
} {
  const cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
  const comp = new PatchConnectionMinimalComponent(cdr);
  comp.data = data;
  return { comp, cdr };
}

function provideNoteSync(comp: PatchConnectionMinimalComponent, noteSync$: Subject<PatchConnection>): void {
  Object.assign(comp, {noteSync$} satisfies Pick<PatchConnectionMinimalComponent, 'noteSync$'>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PatchConnectionMinimalComponent', () => {

  describe('initial state', () => {
    it('starts with showNotes = false', () => {
      const { comp } = makeComponent();
      expect(comp.showNotes).toBe(false);
    });

    it('starts with notes form control value empty', () => {
      const { comp } = makeComponent();
      expect(comp.notes.control.value).toBe('');
    });
  });

  describe('ngOnInit()', () => {
    it('sets showNotes to true when data.notes is truthy', () => {
      const { comp } = makeComponent(makeConnection('patch cable is red'));
      comp.ngOnInit();
      expect(comp.showNotes).toBe(true);
    });

    it('loads existing notes into the form control', () => {
      const { comp } = makeComponent(makeConnection('patch cable is red'));
      comp.ngOnInit();
      expect(comp.notes.control.value).toBe('patch cable is red');
    });

    it('leaves showNotes false when data.notes is undefined', () => {
      const { comp } = makeComponent(makeConnection());
      comp.ngOnInit();
      expect(comp.showNotes).toBe(false);
    });

    it('leaves showNotes false when data.notes is empty string', () => {
      const { comp } = makeComponent(makeConnection(''));
      comp.ngOnInit();
      expect(comp.showNotes).toBe(false);
    });

    it('does not wire sync pipeline when noteSync$ is not provided', fakeAsync(() => {
      const { comp } = makeComponent(makeConnection());
      comp.ngOnInit();
      comp.notes.control.patchValue('new note');
      tick(600);
      // data.notes unchanged — no pipeline wired
      expect(comp.data.notes).toBeUndefined();
      comp.ngOnDestroy();
    }));

    it('wires sync pipeline to noteSync$ when provided', fakeAsync(() => {
      const data = makeConnection();
      const { comp } = makeComponent(data);
      const noteSync$ = new Subject<PatchConnection>();
      const received: PatchConnection[] = [];
      noteSync$.subscribe(c => received.push(c));
      provideNoteSync(comp, noteSync$);

      comp.ngOnInit();
      comp.notes.control.patchValue('cable A-B');
      tick(600);

      expect(received.length).toBe(1);
      expect(received[0].notes).toBe('cable A-B');
      comp.ngOnDestroy();
    }));

    it('updates data.notes when the form control changes', fakeAsync(() => {
      const data = makeConnection();
      const { comp } = makeComponent(data);
      const noteSync$ = new Subject<PatchConnection>();
      noteSync$.subscribe(() => { /* drain */ });
      provideNoteSync(comp, noteSync$);

      comp.ngOnInit();
      comp.notes.control.patchValue('new value');
      tick(600);

      expect(data.notes).toBe('new value');
      comp.ngOnDestroy();
    }));

    it('sets data.notes to undefined when form control is cleared', fakeAsync(() => {
      const data = makeConnection('original note');
      const { comp } = makeComponent(data);
      const noteSync$ = new Subject<PatchConnection>();
      noteSync$.subscribe(() => { /* drain */ });
      provideNoteSync(comp, noteSync$);

      comp.ngOnInit();
      comp.notes.control.patchValue('');
      tick(600);

      expect(data.notes).toBeUndefined();
      comp.ngOnDestroy();
    }));

    it('debounces sync pipeline — does not emit before 600ms', fakeAsync(() => {
      const { comp } = makeComponent(makeConnection());
      const noteSync$ = new Subject<PatchConnection>();
      const received: PatchConnection[] = [];
      noteSync$.subscribe(c => received.push(c));
      provideNoteSync(comp, noteSync$);

      comp.ngOnInit();
      comp.notes.control.patchValue('typing...');
      tick(300); // before debounce window

      expect(received.length).toBe(0);

      tick(300); // complete 600ms window
      expect(received.length).toBe(1);
      comp.ngOnDestroy();
    }));

    it('only emits final value within rapid succession of changes', fakeAsync(() => {
      const { comp } = makeComponent(makeConnection());
      const noteSync$ = new Subject<PatchConnection>();
      const received: PatchConnection[] = [];
      noteSync$.subscribe(c => received.push(c));
      provideNoteSync(comp, noteSync$);

      comp.ngOnInit();
      comp.notes.control.patchValue('a');
      tick(200);
      comp.notes.control.patchValue('ab');
      tick(200);
      comp.notes.control.patchValue('abc');
      tick(600); // debounce settles

      expect(received.length).toBe(1);
      expect(received[0].notes).toBe('abc');
      comp.ngOnDestroy();
    }));
  });

  describe('showNoteInput()', () => {
    it('sets showNotes to true', () => {
      const { comp } = makeComponent();
      comp.showNoteInput();
      expect(comp.showNotes).toBe(true);
    });

    it('calls cdr.markForCheck()', () => {
      const { comp, cdr } = makeComponent();
      comp.showNoteInput();
      expect(cdr.markForCheck).toHaveBeenCalledTimes(1);
    });
  });

  describe('onNoteBlur()', () => {
    it('does not hide notes when control has content', () => {
      const { comp } = makeComponent();
      comp.notes.control.patchValue('some note');
      comp.showNotes = true;
      comp.onNoteBlur();
      expect(comp.showNotes).toBe(true);
    });

    it('hides notes and calls markForCheck when control is empty', () => {
      const { comp, cdr } = makeComponent();
      comp.showNotes = true;
      comp.notes.control.patchValue('');
      comp.onNoteBlur();
      expect(comp.showNotes).toBe(false);
      expect(cdr.markForCheck).toHaveBeenCalledTimes(1);
    });

    it('hides notes when control value is whitespace only', () => {
      const { comp } = makeComponent();
      comp.showNotes = true;
      comp.notes.control.patchValue('   ');
      comp.onNoteBlur();
      expect(comp.showNotes).toBe(false);
    });
  });

  describe('ngOnDestroy()', () => {
    it('stops the sync pipeline after destroy', fakeAsync(() => {
      const { comp } = makeComponent(makeConnection());
      const noteSync$ = new Subject<PatchConnection>();
      const received: PatchConnection[] = [];
      noteSync$.subscribe(c => received.push(c));
      provideNoteSync(comp, noteSync$);

      comp.ngOnInit();
      comp.ngOnDestroy();

      comp.notes.control.patchValue('post-destroy change');
      tick(600);

      expect(received.length).toBe(0);
    }));
  });
});
