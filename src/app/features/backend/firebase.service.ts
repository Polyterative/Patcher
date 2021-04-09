import {
    EventEmitter,
    Injectable
}                          from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import {
    AngularFirestore,
    QueryFn
}                          from '@angular/fire/firestore';
import * as firebase       from 'firebase';
import { User }            from 'firebase';
import {
    concat,
    OperatorFunction,
    ReplaySubject
}                          from 'rxjs';
import { fromPromise }     from 'rxjs/internal-compatibility';
import {
    map,
    take
}                          from 'rxjs/operators';
import { environment }     from '../../../environments/environment';
import {
    DBEuroModule,
    EuroModule,
    Manufacturer
}                          from '../../models/models';
import { zmodules }        from '../../models/modulesdb';
import AuthPersistence = firebase.auth.Auth.Persistence;
import GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
import UserCredential = firebase.auth.UserCredential;
import GetOptions = firebase.firestore.GetOptions;

@Injectable()
export class FirebaseService {
    
    user: { logout$: EventEmitter<void>; login$: EventEmitter<void>; user$: ReplaySubject<UserCredential | User> } = {
        user$:   new ReplaySubject(),
        login$:  new EventEmitter<void>(),
        logout$: new EventEmitter<void>()
    };
    
    add = {
        manufacturer:  (data: EuroModule) => this.addData(paths.manufacturers, data),
        manufacturers: (data: Manufacturer[]) => data.forEach(data => { this.addData(paths.manufacturers, data); }),
        euromodule:    (data: DBEuroModule) =>
                         this.addData(paths.euromodules, {
                             ...data,
                             updated: new Date().toISOString()
                         }),
        euromodules:   (data: DBEuroModule[]) => data.forEach(item => { this.add.euromodule(item); }),
        additional:    (data: string) => this.addData(paths.additional, data)
    
    };
    
    get = {
        manufacturers:     () => this.getDocs(paths.manufacturers, undefined, undefined)
                                     .pipe(map(docs => docs.map(doc => ({
                                         ...doc.data(),
                                         id: doc.id
                                     })))),
        manufactureForId:  (id: string) => this.getDoc(paths.manufacturers, id),
        euromodules:       (getOptions?: GetOptions, query?: QueryFn) => this.getData(paths.euromodules, getOptions, query),
        euromodulesPublic: () => this.getDocs(paths.euromodules, undefined, ref => ref.where('public', '==', true))
                                     .pipe(map(docs => docs.map(doc => ({
                                         ...doc.data(),
                                         id: doc.id
                                     })))),
        euromoduleForId:   (id: string) => this.getDoc(paths.euromodules, id)
    
    };
    private mapToData: OperatorFunction<firebase.firestore.QueryDocumentSnapshot, firebase.firestore.DocumentData> = map(x => x.data());
    
    constructor(
      private fireStore: AngularFirestore,
      private fireAuth: AngularFireAuth
    ) {
        
        // external outlet
        this.user.login$.subscribe(x => {
            this.firebaseLogin();
        });
        
        // external outlet
        this.user.logout$
            .subscribe(x => {
                this.user.user$.next(undefined);
            
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
    
    // getPage(slug) {
    //     return this.getSingleWithId(this.pagesPath, slug)
    //         .pipe(this.mapToData);
    //
    // }
    //
    // getBlogPosts(limit?: number) {
    //     return this.getModuleList(limit);
    // }
    //
    private addData(path: string, data) {
        return fromPromise(this.fireStore.collection(path)
                               .add(data));
    }
    
    private getData = (path: string, options?: GetOptions, query?: QueryFn) => this.getDocs(path, options, query)
                                                                                   .pipe(map(items => items.map(item => item.data())));
    
    private getDocs = (path: string, options?: GetOptions, query?: QueryFn) => this.dbGet(path, options, query)
                                                                                   .pipe(map(data => data.docs));
    
    private dbGet = (path: string, options?: GetOptions, query?: QueryFn) => this.fireStore.collection(path, query)
                                                                                 .get(options ? options : {});
    private getDoc = (path: string, docId: string) => this.fireStore.collection(path)
                                                          .doc(docId);
    private import = {
        manufacturers: (): void => {
            let items = zmodules.map(x => x.mkr)
                                .sort((a, b) => a.name.localeCompare(b.name));
            
            items = items.filter((a, index) => {
                const s = JSON.stringify(a);
                return index === items.findIndex(obj =>
                       JSON.stringify(obj) === s);
            });
            
            // items = items.splice(0, 5);
            
            console.log(items);
            
            this.add.manufacturers(items);
            
        },
        modules:       (): void => {
            // let modules = zmodules.slice(45, allmodules.length - 1);
            let modules = zmodules.slice(0, 1000);
    
            this.getDocs(paths.manufacturers)
                .subscribe((manifacturers) => {
                    let toadd = [];
                
                    modules.forEach(module => {
                    
                        let found = manifacturers.find(a => a.data().name == module.mkr.name);
                        toadd.push(
                          {
                              name:           module.name,
                              manufacturerId: found ? found.id : '',
                              hp:             module.hp,
                              description:    '',
                              ins:            [],
                              outs:           [],
                              switches:       [],
                              manualURL:      '',
                              created:        new Date().toISOString(),
                              updated:        '',
                              public:         false
                          }
                        );
                    
                    });
                
                    this.add.euromodules(toadd);
                
                    console.log(toadd);
                
                });
            
            
            // this.add.euromodules();
            
        }
    };
    
    
    //
    // deleteBlogPost(slug: string) {
    //     this.fireStore.collection(
    //         this.blogPostPath,
    //         ref => ref.limit(1)
    //             .where('slug', '==', slug)
    //     )
    //         .get()
    //         .pipe(mergeMap(x => x.docs), take(1))
    //         .subscribe(x => x.ref.delete());
    // }
    //
    // getInstagramList(limit?: number) {
    //     return this.fireStore.collection(
    //         this.instaPath,
    //         ref => ref.limit(limit ? limit : 999)
    //     )
    //         .valueChanges();
    // }
    
    // editPost(newData: BlogEntryModel, slug, path: string) {
    //     return this.getSingleWithId(path, slug)
    //         .pipe(
    //             filter(x => x && x.exists),
    //             map(x => x.id),
    //             map(x => this.fireStore.collection(path)
    //                 .doc(x)),
    //             switchMap(x => x.update(newData))
    //         );
    //
    // }
    
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
        .subscribe(this.user.user$);
    }
    
    private firebaseLogout() {
        return fromPromise(this.fireAuth.auth.signOut());
    }
    
    private getSingleWithId(path: string, slug) {
        return this.fireStore.collection(
          path,
          ref => ref.limit(1)
                    .where('slug', '==', slug)
                    .where('public', '==', true)
        )
                   .get()
                   .pipe(map(x => x.docs[0]));
    }
    
    // private getModuleList(limit?: number) {
    //     return this.fireStore.collection(
    //       paths.euromodules,
    //       ref => ref.limit(limit ? limit : 999)
    //                 .where('public', '==', true)
    //                 .orderBy('created', 'desc')
    //     )
    //                .valueChanges();
    // }
}

export const paths = {
    additional:    `${ environment.production ? 'prod' : 'dev' }.additional`,
    euromodules:   `${ environment.production ? 'prod' : 'dev' }.euromodules`,
    manufacturers: `${ environment.production ? 'prod' : 'dev' }.manufacturers`
    
};