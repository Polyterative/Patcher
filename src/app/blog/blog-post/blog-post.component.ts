import {
  Component,
  OnInit
}                         from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector:    'app-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls:   ['./blog-post.component.scss']
})
export class BlogPostComponent implements OnInit {
  
  post: string;
  
  constructor(private route: ActivatedRoute) {
  
  }
  
  ngOnInit() {
    this.route.params.subscribe(params => {
      this.post = `./assets/blog/post/${ params.id }.md`;
    });
  }
  
}
