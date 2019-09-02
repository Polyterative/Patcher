import { CommonModule }             from '@angular/common';
import {
    HttpClient,
    HttpClientModule
}                                   from '@angular/common/http';
import { NgModule }                 from '@angular/core';
import { RouterModule }             from '@angular/router';
import { MarkdownModule }           from 'ngx-markdown';
import { AboutMeComponent }         from './about-me/about-me.component';
import { AboutMeModule }            from './about-me/about-me.module';
import { BlogNewPostComponent }     from './blog-new-post/blog-new-post.component';
import { BlogNewPostModule }        from './blog-new-post/blog-new-post.module';
import { BlogPostComponent }        from './blog-post/blog-post.component';
import { BlogPostModule }           from './blog-post/blog-post.module';
import { BlogViewComponent }        from './blog-view/blog-view.component';
import { BlogViewModule }           from './blog-view/blog-view.module';
import { InstagramRouterComponent } from './instagram-router/instagram-router.component';
import { InstagramRouterModule }    from './instagram-router/instagram-router.module';

@NgModule({
    declarations: [],
    imports:      [
        CommonModule,
        BlogViewModule,
        BlogPostModule,
        BlogNewPostModule,
        AboutMeModule,
        InstagramRouterModule,
        RouterModule.forChild([
            {path: 'insta', component: InstagramRouterComponent, pathMatch: 'full'},
            {path: 'blog', component: BlogViewComponent, pathMatch: 'full'},
            {path: 'new', component: BlogNewPostComponent, pathMatch: 'full'},
            {path: 'about', component: AboutMeComponent, pathMatch: 'full'},
            {path: 'edit/:slug', component: BlogNewPostComponent, pathMatch: 'full'},
            {path: 'post/:slug', component: BlogPostComponent}
        ]),
        HttpClientModule,
        MarkdownModule.forRoot({loader: HttpClient})
    ]
})
export class BlogModule {}
