import { CommonModule }               from '@angular/common';
import {
    HttpClient,
    HttpClientModule
}                                     from '@angular/common/http';
import { NgModule }                   from '@angular/core';
import { RouterModule }               from '@angular/router';
import { MarkdownModule }             from 'ngx-markdown';
import { AboutMeComponent }           from './about-me/about-me.component';
import { AboutMeModule }              from './about-me/about-me.module';
import { BlogNewEditPostComponent }   from './blog-new-post/blog-new-edit-post.component';
import { BlogNewPostModule }          from './blog-new-post/blog-new-post.module';
import { BlogPostComponent }          from './blog-post/blog-post.component';
import { BlogPostModule }             from './blog-post/blog-post.module';
import { BlogViewComponent }          from './blog-view/blog-view.component';
import { BlogViewModule }             from './blog-view/blog-view.module';
import { GenerativeSandboxComponent } from './generative-sandbox/generative-sandbox.component';
import { GenerativeSandboxModule }    from './generative-sandbox/generative-sandbox.module';
import { InstagramRouterComponent }   from './instagram-router/instagram-router.component';
import { InstagramRouterModule }      from './instagram-router/instagram-router.module';

@NgModule({
    declarations: [],
    imports:      [
        CommonModule,
        BlogViewModule,
        BlogPostModule,
        BlogNewPostModule,
        AboutMeModule,
        InstagramRouterModule,
        GenerativeSandboxModule,
        RouterModule.forChild([
            {
                path:      'insta',
                component: InstagramRouterComponent,
                pathMatch: 'full'
            },
            {
                path:      'blog',
                component: BlogViewComponent,
                pathMatch: 'full'
            },
            {
                path:      'new',
                component: BlogNewEditPostComponent,
                pathMatch: 'full'
            },
            {
                path:      'about',
                component: AboutMeComponent,
                pathMatch: 'full'
            },
            {
                path:      'art',
                component: GenerativeSandboxComponent,
                pathMatch: 'full'
            },
            {
                path:      'edit/:slug',
                component: BlogNewEditPostComponent,
                pathMatch: 'full'
            },
            {
                path:      'post/:slug',
                component: BlogPostComponent
            }
        ]),
        HttpClientModule,
        MarkdownModule.forRoot({loader: HttpClient})
    ]
})
export class BlogModule {}
