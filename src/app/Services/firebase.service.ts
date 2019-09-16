import { Injectable }       from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import {
    map,
    mergeMap,
    take
}                           from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class FirebaseService {
    pagesPath = 'pages';
    blogPostPath = 'blogPosts';
    instaPath = 'insta-links';

    constructor(
      private firestore: AngularFirestore
    ) {
    }

    getPage(slug) {
        return this.getSingleWithSlug(this.pagesPath, slug);
    }

    getBlogPost(slug) {
        return this.getSingleWithSlug(this.blogPostPath, slug);
    }

    getBlogPosts(limit?: number) {
        return this.getBlogList(limit);
    }

    add(path: string, data): void {
        this.firestore.collection(path).add(data);
    }

    deletePost(slug: string) {
        this.firestore.collection(
          this.blogPostPath,
          ref => ref.limit(1).where('slug', '==', slug)
          )
          .get()
          .pipe(mergeMap(x => x.docs), take(1))
          .subscribe(x => x.ref.delete());
    }
    
    getInstagramList(limit?: number) {
        return this.firestore.collection(
          this.instaPath,
          ref => ref.limit(limit ? limit : 999)
          )
          .valueChanges();
    }

    private getSingleWithSlug(path: string, slug: number) {
        return this.firestore.collection(
          path,
          ref => ref.limit(1)
            .where('slug', '==', slug)
            .where('public', '==', true)
          )
          .get()
          .pipe(
            map(x => x.docs[0].data())
          );
    }

    private getBlogList(limit?: number) {
        return this.firestore.collection(
          this.blogPostPath,
          ref => ref.limit(limit ? limit : 999)
            .where('public', '==', true)
            .orderBy('created', 'desc')
          )
          .valueChanges();
    }
}
