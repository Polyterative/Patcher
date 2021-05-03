import {
  Component,
  Input,
  OnInit
} from '@angular/core';

/**
 * questo componente ti aiuta a tenere sotto controllo le dimensioni
 * massime di ciò che gli butti dentro per esempio permette di creare
 * un piccolo wrapper per aggiungendo dei bordi ai lati quando usi uno schermo
 * 2k ma non fhd oppure permette di forzare roba ad una certa dimensione
 */
@Component({
  selector:    'lib-screen-wrapper',
  templateUrl: './screen-wrapper.component.html',
  styleUrls:   ['./screen-wrapper.component.scss']
})
export class ScreenWrapperComponent implements OnInit {
  
  @Input()
  maxSize = '76rem'; //kinda fhd, good default
  
  @Input()
  force = false;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
