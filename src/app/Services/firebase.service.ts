import { Injectable }       from '@angular/core';
import { AngularFireAuth }  from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import * as firebase        from 'firebase';
import {
    OperatorFunction,
    Subject
}                           from 'rxjs';
import { fromPromise }      from 'rxjs/internal-compatibility';
import {
    filter,
    map,
    mergeMap,
    switchMap,
    take,
    tap
}                           from 'rxjs/operators';
import { BlogEntryModel }   from '../blog/blog-models';
import GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
import UserCredential = firebase.auth.UserCredential;

@Injectable({
    providedIn: 'root'
})
export class FirebaseService {
    pagesPath = 'pages';
    blogPostPath = 'blogPosts';
    instaPath = 'insta-links';
    user$: Subject<UserCredential> = new Subject();
    
    private mapToData: OperatorFunction<firebase.firestore.QueryDocumentSnapshot, firebase.firestore.DocumentData> = map(x => x.data());
    
    constructor(
        private store: AngularFirestore,
        private auth: AngularFireAuth
    ) {
    }
    
    login() {
        const auth$ = fromPromise(this.auth.auth.signInWithPopup(new GoogleAuthProvider()));
        auth$.pipe(filter(x => !(!x)), tap(x => console.log(x))).subscribe(this.user$);
    }
    
    logout() {
        return fromPromise(this.auth.auth.signOut());
    }
    
    getPage(slug) {
        return this.getSingleWithSlug(this.pagesPath, slug).pipe(this.mapToData);
        
    }
    
    getBlogPost(slug) {
        return this.getSingleWithSlug(this.blogPostPath, slug).pipe(this.mapToData);
    }
    
    getBlogPosts(limit?: number) {
        return this.getBlogList(limit);
    }
    
    add(path: string, data) {
        return fromPromise(this.store.collection(path).add(data));
    }
    
    deleteBlogPost(slug: string) {
        this.store.collection(
            this.blogPostPath,
            ref => ref.limit(1).where('slug', '==', slug)
        )
            .get()
            .pipe(mergeMap(x => x.docs), take(1))
            .subscribe(x => x.ref.delete());
    }
    
    getInstagramList(limit?: number) {
        return this.store.collection(
            this.instaPath,
            ref => ref.limit(limit ? limit : 999)
        )
            .valueChanges();
    }
    
    editPost(newData: BlogEntryModel, slug, path: string) {
        return this.getSingleWithSlug(path, slug)
            .pipe(
                filter(x => x && x.exists),
                map(x => x.id),
                map(x => this.store.collection(path).doc(x)),
                switchMap(x => x.update(newData))
            );
        
    }
    
    private getSingleWithSlug(path: string, slug) {
        return this.store.collection(
            path,
            ref => ref.limit(1)
                .where('slug', '==', slug)
                .where('public', '==', true)
        )
            .get()
            .pipe(map(x => x.docs[0]));
    }
    
    private getBlogList(limit?: number) {
        return this.store.collection(
            this.blogPostPath,
            ref => ref.limit(limit ? limit : 999)
                .where('public', '==', true)
                .orderBy('created', 'desc')
        )
            .valueChanges();
    }
    
}
