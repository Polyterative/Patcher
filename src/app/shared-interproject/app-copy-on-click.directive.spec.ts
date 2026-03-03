import { ElementRef } from '@angular/core';
import { CopyableDirective } from './app-copy-on-click.directive';


function buildDirective(innerText = 'Hello World') {
  const nativeElement = {style: {cursor: ''}, innerText};
  const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const directive = new CopyableDirective(new ElementRef(nativeElement), snackBar);
  return {directive, nativeElement, snackBar};
}


describe('CopyableDirective', () => {
  let writeTextSpy: jasmine.Spy;
  let clipboardMock: {
    writeText: jasmine.Spy
  };
  
  beforeAll(() => {
    clipboardMock = {writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())};
    Object.defineProperty(navigator, 'clipboard', {value: clipboardMock, configurable: true});
    writeTextSpy = clipboardMock.writeText;
  });
  
  beforeEach(() => {
    writeTextSpy.calls.reset();
    writeTextSpy.and.returnValue(Promise.resolve());
  });
  
  it('sets cursor to pointer on mouseenter', () => {
    const {directive, nativeElement} = buildDirective();
    directive.onMouseEnter();
    expect(nativeElement.style.cursor).toBe('pointer');
  });
  
  it('resets cursor to default on mouseleave', () => {
    const {directive, nativeElement} = buildDirective();
    nativeElement.style.cursor = 'pointer';
    directive.onMouseLeave();
    expect(nativeElement.style.cursor).toBe('default');
  });
  
  it('calls clipboard.writeText with element innerText on click', () => {
    const {directive} = buildDirective('Copy Me');
    directive.onClick();
    expect(writeTextSpy).toHaveBeenCalledWith('Copy Me');
  });
  
  it('opens snack bar after successful clipboard write', async () => {
    const {directive, snackBar} = buildDirective('Copy Me');
    directive.onClick();
    await Promise.resolve();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Copied to clipboard: Copy Me', undefined, jasmine.objectContaining({duration: 3000})
    );
  });
  
  it('does not throw and does not open snackbar when clipboard rejects', async () => {
    writeTextSpy.and.returnValue(Promise.reject(new Error('denied')));
    const {directive, snackBar} = buildDirective();
    expect(() => directive.onClick()).not.toThrow();
    await Promise.resolve();
    expect(snackBar.open).not.toHaveBeenCalled();
  });
});