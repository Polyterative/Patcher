import {
  Component,
  Input,
  OnInit
} from '@angular/core';

type ScreenWrapperSizePreset = 'default' | 'wide-shell' | 'full-bleed';

const SCREEN_WRAPPER_SIZE_PRESETS: Record<ScreenWrapperSizePreset, string> = {
  default: '86rem',
  'wide-shell': '130rem',
  'full-bleed': '100%'
};


/**
 * questo componente ti aiuta a tenere sotto controllo le dimensioni
 * massime di ciò che gli butti dentro per esempio permette di creare
 * un piccolo wrapper per aggiungendo dei bordi ai lati quando usi uno schermo
 * 2k ma non fhd oppure permette di forzare roba ad una certa dimensione
 */
@Component({
  selector: 'lib-screen-wrapper',
  templateUrl: './screen-wrapper.component.html',
  styleUrls: ['./screen-wrapper.component.scss'],
  standalone: false
})
export class ScreenWrapperComponent implements OnInit {
  
  @Input()
  maxSize = '86rem'; //kinda fhd, good default

  @Input()
  sizePreset?: ScreenWrapperSizePreset;
  
  @Input()
  force = false;
  
  constructor() { }
  
  ngOnInit(): void {
  }

  get resolvedMaxSize(): string {
    return this.sizePreset ? SCREEN_WRAPPER_SIZE_PRESETS[this.sizePreset] : this.maxSize;
  }
  
}
