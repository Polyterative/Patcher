import { NgModule } from '@angular/core';
import { ModuleCollectionCardModule } from './module-collection-card/module-collection-card.module';
import { ModuleCollectionEditorModule } from './module-collection-editor/module-collection-editor.module';

@NgModule({
  imports: [
    ModuleCollectionCardModule,
    ModuleCollectionEditorModule
  ],
  exports: [
    ModuleCollectionCardModule,
    ModuleCollectionEditorModule
  ]
})
export class ModuleCollectionPartsModule {}
