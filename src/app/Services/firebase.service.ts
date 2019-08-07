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
  
  getBlogPosts(limit?: number) {
    return this.getBlogList(limit);
  }
  
  private getSingleWithId(path: string, id: number) {
    return this.firestore.collection(
      path,
      ref => ref.limit(1)
        .where('id', '==', id)
    )
      .get()
      .pipe(map(x => x.docs[0].data()));
  }
  
  private getBlogList(limit?: number) {
    return this.firestore.collection(
      this.blogPostPath,
      ref => ref.limit(limit ? limit : 999)
        .orderBy('id', 'desc')
    )
      .valueChanges();
  }
}
