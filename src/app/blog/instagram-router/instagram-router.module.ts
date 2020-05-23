import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { OrangeStructuresModule }   from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogPostStructureModule }  from '../blog-post-structure/blog-post-structure.module';
import { InstagramRouterComponent } from './instagram-router.component';


@NgModule({
    declarations: [InstagramRouterComponent],
    imports:      [
        CommonModule,
        MatProgressBarModule,
        BlogPostStructureModule,
        MatCardModule,
        OrangeStructuresModule,
        FlexLayoutModule,
        MatButtonModule
    ],
    exports:      [InstagramRouterComponent]
})
export class InstagramRouterModule {}
