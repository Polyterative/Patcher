import { Injectable }       from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { map }              from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  public pagesPath = 'pages';
  public blogPostPath = 'blogPosts';
  
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
  
  private getSingleWithSlug(path: string, slug: number) {
    return this.firestore.collection(
      path,
      ref => ref.limit(1)
        .where('slug', '==', slug)
    )
      .get()
      .pipe(map(x => x.docs[0].data()));
  }
  
  private getBlogList(limit?: number) {
    return this.firestore.collection(
      this.blogPostPath,
      ref => ref.limit(limit ? limit : 999)
        .orderBy('created', 'desc')
    )
      .valueChanges();
  }
  
  public add(path: string, data): void {
    this.firestore.collection(path).add(data);
  }
}
