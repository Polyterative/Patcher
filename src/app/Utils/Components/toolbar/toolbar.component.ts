import {
  Component,
  OnInit
}                         from '@angular/core';
import { Router }         from '@angular/router';
import { ToolbarService } from 'src/app/Utils/Components/toolbar/toolbar.service';

@Component({
  selector:    'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls:   ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {
  
  constructor(public toolbarService: ToolbarService, public router: Router) {
  }
  
  ngOnInit(): void {
  }
  
  navigate(to: string[]): void {
    this.router.navigate(to);
  }
  
}
