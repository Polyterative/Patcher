import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';


@Directive({
  selector: '[appRestrictedLogged]',
  standalone: true
})
export class RestrictedLoggedDirective {
  private hasView = false;
  
  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef
  ) { }
  
  @Input() set appUnless(condition: boolean) {
    if (!condition && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (condition && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}