import {
    Injectable,
    OnDestroy,
    OnInit
}                    from '@angular/core';
import * as Tone     from 'tone';
import { Transport } from 'tone';

@Injectable()
export class BeeperService implements OnDestroy, OnInit {
  //create a synth and connect it to the main output (your speakers)
  synth;

  constructor() {
  }

  public beepShort() {
    this.initSynth();
    this.synth.unsync();
    Transport.stop();
    this.synth.sync();
    this.synth.triggerAttackRelease('G4', '16n', 0);
    Transport.bpm.value = 120;
    Transport.start();
  }

  public beepWarning() {
    this.initSynth();
    this.synth.unsync();
    Transport.stop();
    this.synth.sync();
    this.synth.triggerAttackRelease('B5', '16n', 0);
    this.synth.triggerAttackRelease('B5', '16n', '8n');
    Transport.bpm.value = 120;
    Transport.start();
  }

  public beepLong() {

  }

  public beepSuccess() {
    this.initSynth();
    this.synth.unsync();
    Transport.stop();
    this.synth.sync();
    this.synth.triggerAttackRelease('C4', '16n', 0);
    this.synth.triggerAttackRelease('G4', '16n', '8n');
    Transport.bpm.value = 120;
    Transport.start();

  }

  ngOnDestroy(): void {
    if (this.synth) {
      this.synth.dispose();
    }


  }

  initSynth() {
    /**
     * I cannot initialize it right away because
     * when the service is being injected the user hasn't
     * yet rendered anything on screen and trying to
     * initialize an audio output at that moment that generates a warning in Chrome
     */
    if (this.synth == undefined) {

      this.synth = new Tone.Synth({volume: -6}).toDestination();
    }
  }

  ngOnInit(): void {

  }


}
