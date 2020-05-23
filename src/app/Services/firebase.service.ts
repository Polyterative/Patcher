import {
    EventEmitter,
    Injectable
}                           from '@angular/core';
import { AngularFireAuth }  from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import * as firebase        from 'firebase';
import { User }             from 'firebase';
import {
    concat,
    OperatorFunction,
    ReplaySubject
}                           from 'rxjs';
import { fromPromise }      from 'rxjs/internal-compatibility';
import {
    filter,
    map,
    mergeMap,
    switchMap,
    take
}                           from 'rxjs/operators';
import { BlogEntryModel }   from '../blog/blog-models';
import AuthPersistence = firebase.auth.Auth.Persistence;
import GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
import UserCredential = firebase.auth.UserCredential;

@Injectable({
    providedIn: 'root'
})
export class FirebaseService {
    pagesPath = 'pages';
    blogPostPath = 'blogPosts';
    instaPath = 'insta-links';
    user$: ReplaySubject<UserCredential | User> = new ReplaySubject();
    
    login$ = new EventEmitter<void>();
    logout$ = new EventEmitter<void>();
    
    private mapToData: OperatorFunction<firebase.firestore.QueryDocumentSnapshot, firebase.firestore.DocumentData> = map(x => x.data());
    
    constructor(
        private fireStore: AngularFirestore,
        private fireAuth: AngularFireAuth
    ) {
        
        // external outlet
        this.login$.subscribe(x => {
            this.firebaseLogin();
        });
        
        // external outlet
        this.logout$
            .subscribe(x => {
                this.user$.next(undefined);
                
                this.firebaseLogout();
            });
        
        // login
        // fireAuth.user
        //     .pipe(
        //         filter(x => x && x.emailVerified && !!x.displayName)
        //     )
        //     .subscribe(x => {
        //         this.user$.next(x);
        //     });
        //
        // this.user$.subscribe(x => {
        //     console.warn(x);
        // });
    }
    
    getPage(slug) {
        return this.getSingleWithSlug(this.pagesPath, slug)
            .pipe(this.mapToData);
        
    }
    
    getBlogPost(slug) {
        return this.getSingleWithSlug(this.blogPostPath, slug)
            .pipe(this.mapToData);
    }
    
    getBlogPosts(limit?: number) {
        return this.getBlogList(limit);
    }
    
    add(path: string, data) {
        return fromPromise(this.fireStore.collection(path)
            .add(data));
    }
    
    deleteBlogPost(slug: string) {
        this.fireStore.collection(
            this.blogPostPath,
            ref => ref.limit(1)
                .where('slug', '==', slug)
        )
            .get()
            .pipe(mergeMap(x => x.docs), take(1))
            .subscribe(x => x.ref.delete());
    }
    
    getInstagramList(limit?: number) {
        return this.fireStore.collection(
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
                map(x => this.fireStore.collection(path)
                    .doc(x)),
                switchMap(x => x.update(newData))
            );
        
    }
    
    private firebaseLogin() {
        const persistence$ = fromPromise(this.fireAuth.auth.setPersistence(AuthPersistence.LOCAL))
            .pipe(take(1));
        const auth$ = fromPromise(this.fireAuth.auth.signInWithPopup(new GoogleAuthProvider()));
        
        concat(
            persistence$.pipe(map(() => undefined)),
            auth$
        )
            .pipe(
                // filter(x => !!x),
                // tap(x => console.log(x))
            )
            .subscribe(this.user$);
    }
    
    private firebaseLogout() {
        return fromPromise(this.fireAuth.auth.signOut());
    }
    
    private getSingleWithSlug(path: string, slug) {
        return this.fireStore.collection(
            path,
            ref => ref.limit(1)
                .where('slug', '==', slug)
                .where('public', '==', true)
        )
            .get()
            .pipe(map(x => x.docs[0]));
    }
    
    private getBlogList(limit?: number) {
        return this.fireStore.collection(
            this.blogPostPath,
            ref => ref.limit(limit ? limit : 999)
                .where('public', '==', true)
                .orderBy('created', 'desc')
        )
            .valueChanges();
    }
    
}
