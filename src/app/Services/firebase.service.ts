import { Injectable }       from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { map }              from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private pagesPath = 'pages';
  private blogPostPath = 'blogPosts';
  
  constructor(
    private firestore: AngularFirestore
  ) {
  }
  
  getPage(id) {
    return this.getSingleWithId(this.pagesPath, id);
  }
  
  getBlogPost(id) {
    return this.getSingleWithId(this.blogPostPath, id);
  }
  
  private getSingleWithId(path, id) {
    return this.firestore.collection(
      path,
      ref => ref.limit(1)
        .where('id', '==', parseInt(id, 10))
    )
      .get()
      .pipe(map(x => x.docs[0].data()));
  }
}
