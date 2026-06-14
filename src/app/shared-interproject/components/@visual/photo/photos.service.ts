import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

interface UnsplashResponse {
  urls: {
    regular: string;
  };
}

@Injectable()
export class PhotosService extends SubManager implements OnDestroy {
  public readonly url$ = new BehaviorSubject<string>('');
  public readonly loadUnsplash$ = new Subject<string>();
  
  ngOnDestroy(): void {
    super.ngOnDestroy();
  }
  
  constructor(private http: HttpClient) {
    super();
    
    // this.loadUnsplash$
    //     .pipe(
    //       switchMap(x =>{})
    //     )
    //     .subscribe(value => {
    //
    //     });
  }
  
  
}
