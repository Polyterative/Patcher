import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                    from '@angular/core';
import {
  Subject,
  zip
}                    from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DbModule }        from 'src/app/models/models';
import { SupabaseService } from '../supabase.service';

@Component({
  selector:        'app-admin-panel-root',
  templateUrl:     './admin-panel-root.component.html',
  styleUrls:       ['./admin-panel-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPanelRootComponent implements OnInit {
  devToProd$ = new Subject();
  downloadProd$ = new Subject();
  downloadDev$ = new Subject();
  prodToDev$ = new Subject();
  click$ = new Subject();
  
  constructor(public backend: SupabaseService) { }
  
  ngOnInit(): void {
  
    this.click$
        .pipe(
          switchMap(x => zip(
            this.backend.get.modulesFull(0, 99999),
            this.backend.get.manufacturers(0, 99999)
            )
          )
        )
        .subscribe(([modules, manufacturers]) => {
          console.clear();
          // console.table(modules.data);
          let dbmodules: DbModule[] = modules.data;
    
          let toUpdate: DbModule[] = [];
    
          for (let module of this.data) {
            let newName: string = module.name.trim();
            let foundModule: any = dbmodules.find(x => x.name.trim() === newName);
            if (foundModule) {
        
              let data1: DbModule = {
                ...foundModule,
                description: module.desc
              };
        
              // console.log(data1);
              this.backend.update.module(data1)
                  .subscribe(value => {});
            }
          }
    
          // console.group(toAdd)
          // let z = modules.data.filter(value => (value.ins.length > 0) || (value.outs.length > 0));
          //
          //
          // z.forEach(m => {
          //
          //   this.backend.add.moduleOUTs(m.outs, m.id)
          //       .subscribe(value => {});
          //
          // });
    
        });
  
    // this.click$.next();
  }
  
  data = [
    {
      name:    'Cosmopolitan',
      manu:    'Moseley Instruments',
      desc:    'Dual phase distortion oscillator',
      'PRICE': '289',
      'HP':    '20'
    },
    {
      name:    'Audio Mixer',
      manu:    'Noise Reap',
      desc:    'Logarithmic 3 channel mixer',
      'PRICE': '69',
      'HP':    '8'
    },
    {
      name:    'ERROR DRUM !',
      manu:    'Error Instruments',
      desc:    '12 drum sounds / good price !',
      'PRICE': '69',
      'HP':    '4'
    },
    {
      name:    'Blender Six',
      manu:    'Purrtronics',
      desc:    'Six Channel Transistor Mixer and Wave Folder',
      'PRICE': '110',
      'HP':    '14'
    },
    {
      name:    'MARLYNS BANG !',
      manu:    'Error Instruments',
      desc:    'Low drone drum generator - only 10 made',
      'PRICE': '79',
      'HP':    '6'
    },
    {
      name:    'OptoThing 3 ALPHA',
      manu:    'York Modular',
      desc:    'Optocoupler VCA / filter / sound-mangle',
      'PRICE': '35',
      'HP':    '4'
    },
    {
      name:    'Mult + Pass Thru',
      manu:    'Mazzatron',
      desc:    'Passive Mult and Pass Thru Module',
      'PRICE': '26',
      'HP':    '6'
    },
    {
      name:    'Indian Resonator',
      manu:    'Error Instruments',
      desc:    'Organic Bass Sound Resonating Into An Indian Flute',
      'PRICE': '175',
      'HP':    '8'
    },
    {
      name:    'MRG 3360 VCA',
      manu:    'MRG Synthesizers',
      desc:    'AS3360-based Dual Linear VCA',
      'PRICE': '80',
      'HP':    '4'
    },
    {
      name:    'CMIX',
      manu:    'Reverse Landfill',
      desc:    '6 channel Video mixer',
      'PRICE': '140',
      'HP':    '8'
    },
    {
      name: 'Super Sloth (Clarke Robinson panel)',
      manu: 'Nonlinearcircuits',
      desc: 'Slow chaotic control voltage generator',
      'HP': '4'
    },
    {
      name:    'P-071 dual switch',
      manu:    'Ladik',
      desc:    'Passive dual switch for CV or audio',
      'PRICE': '32',
      'HP':    '4'
    },
    {
      name:    'PatchBlocks',
      manu:    'Maker.ie',
      desc:    'PatchBlocks (in Red)',
      'PRICE': '178',
      'HP':    '8'
    },
    {
      name:    'ER-150 HERCULES',
      manu:    'ARREL Audio',
      desc:    'High Quality Power Solution',
      'PRICE': '290',
      'HP':    '10'
    },
    {
      name:    'ADDAC200A',
      manu:    'ADDAC System',
      desc:    'Eurorack Current Ammeter',
      'PRICE': '90',
      'HP':    '14'
    },
    {
      name: 'Simple Wave Folder',
      manu: 'Blue Lantern Modules',
      desc: '4hp six stage simple wave folder',
      'HP': '4'
    },
    {
      name: 'DIY 12hp Warps',
      manu: 'Blue Lantern Modules',
      'HP': '12'
    },
    {
      name: 'Chronoblob - Magpie white panel',
      manu: 'Alright Devices',
      desc: 'Syncable delay',
      'HP': '10'
    },
    {
      name:    'SHFT',
      manu:    'Dovemans',
      desc:    'Compact dual window comparator',
      'PRICE': '166',
      'HP':    '6 HP'
    },
    {
      name:    'Kaiwa',
      manu:    'Polaxis',
      desc:    'Speech Synthesizer with Japanese language',
      'PRICE': '250',
      'HP':    '16'
    },
    {
      name:    'm16/Multiplex',
      manu:    'Trogotronic',
      desc:    'Analog 4 Channel VCA  Voltage Controlled MiniMixer',
      'PRICE': '179',
      'HP':    '8'
    },
    {
      name:    'Turing Machine LPG Expander',
      manu:    'WORNG Electronics',
      desc:    'Expander which adds 8 vactrol LPGs to the Turing Machine (Black and gold panel) ',
      'PRICE': '153',
      'HP':    '10'
    },
    {
      name:    'NEON black',
      manu:    'Paratek',
      desc:    'Analog VU-meter',
      'PRICE': '103',
      'HP':    '8'
    },
    {
      name:    'lfo',
      manu:    'Nakedboards',
      desc:    'Dual voltage controlled low frequency oscillator',
      'PRICE': '210',
      'HP':    '14'
    },
    {
      name:    'Multimix',
      manu:    'Oakley',
      desc:    'Three channel attenuator with inverting mode  mix output',
      'PRICE': '100',
      'HP':    '6'
    },
    {
      name:    'dualswitch',
      manu:    'eurorack essentials',
      desc:    'bidirectional passive dual switch',
      'PRICE': '89',
      'HP':    '3'
    },
    {
      name:    'Invictus',
      manu:    'Arcaico',
      desc:    'Quad Function Generator',
      'PRICE': '340',
      'HP':    '22'
    },
    {
      name:    'Hike',
      manu:    'Tenderfoot Electronics',
      desc:    '2 - Channel Envelope  Random Voltage Generator',
      'PRICE': '184',
      'HP':    '8'
    },
    {
      name:    'BLM Assist Percussion Utility (APU) MK2',
      manu:    'Blue Lantern Modules',
      desc:    'Drum Kick helper',
      'PRICE': '88',
      'HP':    '12'
    },
    {
      name:    'TP8',
      manu:    'XODES',
      desc:    '8 I/O Touch Pads',
      'PRICE': '36',
      'HP':    '6'
    },
    {
      name:    'LB5 - 3U',
      manu:    'XODES',
      desc:    '5 Logic Blocks',
      'PRICE': '114',
      'HP':    '5'
    },
    {
      name:    'Video Mult',
      manu:    'Visible Signals',
      desc:    'Video bandwidth dual 3-output buffered multiple',
      'PRICE': '19',
      'HP':    '4'
    },
    {
      name:    'AGOGO - black mirror panel',
      manu:    'Jolin Lab',
      desc:    '8 Chained Vactrol LPGs',
      'PRICE': '290',
      'HP':    '6'
    },
    {
      name:    'S-909',
      manu:    'SoundForce',
      desc:    '6 channel drum sample player - 909 version',
      'PRICE': '119',
      'HP':    '4'
    },
    {
      name:    'ENV-310',
      manu:    'Feedback',
      desc:    'Envelope generator based on AS3310.',
      'PRICE': '50',
      'HP':    '6'
    },
    {
      name:    '2HP dual selector BW',
      manu:    'ph modular',
      desc:    'dual AB selector 2HP',
      'PRICE': '25',
      'HP':    '2'
    },
    {
      name:    'FSR-2P',
      manu:    'Synthwerks',
      desc:    'dual passive force sensing resistor module with reversible panel ',
      'PRICE': '46',
      'HP':    '14'
    },
    {
      name:    'ES16 - Extended ADSR',
      manu:    'Elby Designs',
      desc:    'Extended ADSR',
      'PRICE': '250',
      'HP':    '15'
    },
    {
      name:    'ASM301 - ADSR',
      manu:    'Elby Designs',
      desc:    'ADSR',
      'PRICE': '97',
      'HP':    '10'
    },
    {
      name:    'MIDI-CV-8',
      manu:    'PMFoundations',
      desc:    'MIDI-USB Keyboard Controller MIDI-CV Interface',
      'PRICE': '27',
      'HP':    '8'
    },
    {
      name:    'Little Nerd (Magpie panel)',
      manu:    'Bastl Instruments',
      desc:    'Clock, trigger and gate processor',
      'PRICE': '19',
      'HP':    '6'
    },
    {
      name:    'spink0',
      manu:    'Seismic Industries',
      desc:    'DIY eurorack CLK / RST generator for Ableton LINK',
      'PRICE': '259',
      'HP':    '6'
    },
    {
      name: 'CS023 Dual VCO',
      manu: 'Circuit Slices',
      desc: 'Dual Parallel VCO',
      'HP': '12'
    },
    {
      name:    'Waveform Animator',
      manu:    'Barton Musical Circuits',
      desc:    '(Aluminium panel)',
      'PRICE': '78',
      'HP':    '6'
    },
    {
      name:    'QCD Expander - Black Panel',
      manu:    '4ms Company',
      desc:    'DIY replacement faceplate for the QCD Expander',
      'PRICE': '32',
      'HP':    '12'
    },
    {
      name:    'Cursus Iteritas Percido (Silver)',
      manu:    'Noise Engineering',
      desc:    'Wavetable oscillator with envelope and One Knob to Rule Them All ',
      'PRICE': '531',
      'HP':    '24'
    },
    {
      name:    'Mix4',
      manu:    'York Modular',
      desc:    '4-channel active mixer with illuminated faders and gain contro',
      'PRICE': '50',
      'HP':    '10'
    },
    {
      name:    'Bad Idea #9',
      manu:    'M&oslash;ffenzeef M&oslash;dular',
      desc:    'P&Oslash;WER STARVED GLITCH &Oslash;SCILLAT&Oslash;R',
      'PRICE': '98',
      'HP':    '4'
    },
    {
      name:    'A-595',
      manu:    'Ladik',
      desc:    'Stereo line in  line out',
      'PRICE': '44',
      'HP':    '4'
    },
    {
      name:    'Pwr',
      manu:    'Electrosmith',
      desc:    'Eurorack Power Supply',
      'PRICE': '138',
      'HP':    '4'
    },
    {
      name:    'Turn! Turn!',
      manu:    'Frequency Central',
      desc:    'Precision voltage source',
      'PRICE': '106',
      'HP':    '8'
    },
    {
      name:    'BCI',
      manu:    'XODES',
      desc:    'Black Card Interface',
      'PRICE': '60',
      'HP':    '2'
    },
    {
      name:    'Twiigs (black)',
      manu:    'CalSynth',
      desc:    'Dual Branches',
      'PRICE': '147',
      'HP':    '8'
    },
    {
      name:    'ADDAC204 VC CV Mapping',
      manu:    'ADDAC System',
      desc:    'With the VC mapping module you\'ll be able to scale your voltage and also control its...',
      'PRICE': '180',
      'HP':    '6'
    },
    {
      name:    'Jerkster Chaos (Clarke Panel)',
      manu:    'synthCube',
      desc:    'Ian Fritz Jerkster Chaos Generator',
      'PRICE': '134',
      'HP':    '8'
    },
    {
      name:    'Poly Mix',
      manu:    'Blue Lantern Modules',
      desc:    'Simple Polyphonic 4 voice Audio Mixer',
      'PRICE': '116',
      'HP':    '12'
    },
    {
      name:    'K6100 Panning VCA',
      manu:    'Kilpatrick Audio',
      desc:    'Dual/Stereo VCA Panner',
      'PRICE': '200',
      'HP':    '10'
    },
    {
      name:    'Dual VCA',
      manu:    'Radical Frequencies',
      desc:    '100% handmade through hole Dual Vca with Linear and Logarithmic Function',
      'PRICE': '100',
      'HP':    '10'
    },
    {
      name:    'Frequency Shifter',
      manu:    'Klangbau K&ouml;ln',
      desc:    'Frequency Shifter (Needs Modulator)',
      'PRICE': '220',
      'HP':    '10'
    },
    {
      name:    'VCF-12',
      manu:    'Steffcorp',
      desc:    'A discrete ladder-filter, based on the ARP 2600 4012 filter',
      'PRICE': '328',
      'HP':    '14'
    },
    {
      name:    'SUMMINGFACILITY',
      manu:    'Audio Gear Obsession',
      desc:    'Hi-quality 6 channels, 2 bus stereo mixer',
      'PRICE': '990',
      'HP':    '38 HP'
    },
    {
      name:    'Touch Controlled Voltage Source MODEL 112',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Transistor Touch Controlled Voltage Source Inspired by Buchla 112',
      'PRICE': '616',
      'HP':    '28'
    },
    {
      name:    'HVM',
      manu:    'Oakley',
      desc:    'Human Voice Module - fixed filter bank',
      'PRICE': '150',
      'HP':    '8'
    },
    {
      name:    'S-260 6-to-2 ORer',
      manu:    'Ladik',
      desc:    'logic OR module',
      'PRICE': '72',
      'HP':    '8'
    },
    {
      name: '&mu;SUM',
      manu: 'ST Modular',
      desc: 'Moog CP3 based 3-Channel Analog Mixer with EQ  Mute Switches ',
      'HP': '8'
    },
    {
      name:    'Fixed Filter Bank (2020 version)',
      manu:    'EMW',
      desc:    'New version with individual bandpass outputs',
      'PRICE': '123',
      'HP':    '12'
    },
    {
      name:    'РИТМИКС black (rainbow)',
      manu:    'Paratek',
      desc:    '8 channels mixer unit',
      'PRICE': '179',
      'HP':    '12 HP'
    },
    {
      name:    'РИТМИКС black (pink)',
      manu:    'Paratek',
      desc:    '8 channels mixer unit',
      'PRICE': '179',
      'HP':    '12 HP'
    },
    {
      name:    'OUROBOROS',
      manu:    'Orpho',
      desc:    'Vacuum Tube VCO',
      'PRICE': '185',
      'HP':    '12'
    },
    {
      name:    'CEM3340 VCO',
      manu:    'Timo Rozendal',
      desc:    'Curtis-Based VCO',
      'PRICE': '22',
      'HP':    '8'
    },
    {
      name:    'Germanium VCA',
      manu:    'L-1',
      desc:    'Germanium VCA + Distortion',
      'PRICE': '188',
      'HP':    '10'
    },
    {
      name:    'VC AMP MIX',
      manu:    'ACL',
      desc:    'Quad exponential VCA with 3 summed outputs',
      'PRICE': '390',
      'HP':    '12'
    },
    {
      name:    'Dwarf Star Stereo Delay FX MK2',
      manu:    'Blue Lantern Modules',
      desc:    'Stereo delay',
      'PRICE': '171',
      'HP':    '18'
    },
    {
      name:    'Swiss Army Mixer V2',
      manu:    'Noise Reap',
      desc:    'Utility Mixer',
      'PRICE': '70',
      'HP':    '8'
    },
    {
      name:    'LFO',
      manu:    'Stem Modular',
      desc:    'LFO',
      'PRICE': '64',
      'HP':    '6'
    },
    {
      name:    'per|former',
      manu:    'Westlicht',
      desc:    'Westlicht Performer Red Knob',
      'PRICE': '370',
      'HP':    '34'
    },
    {
      name:    'S-230 (Black)',
      manu:    'Ladik',
      desc:    'Shuffled grid module',
      'PRICE': '70',
      'HP':    '8'
    },
    {
      name:    'TUL',
      manu:    'Rides in the Storm',
      desc:    'Dual Attenuator/Attenuverter + Offset Generator',
      'PRICE': '66',
      'HP':    '6'
    },
    {
      name:    'Пуск-3 black',
      manu:    'Paratek',
      desc:    'vactrol based 3 channel muter / gater',
      'PRICE': '74',
      'HP':    '4'
    },
    {
      name:    'Pachinko (White)',
      manu:    'CalSynth',
      desc:    '12HP Marbles',
      'PRICE': '221',
      'HP':    '12'
    },
    {
      name:    'Quadrature LFO AQA ElektriX QLFO',
      manu:    'Aqa Elektrix',
      desc:    'The Quadrature LFO is generating an sine wave and 3 phase-shifted copies of it: by 90&deg;...',
      'PRICE': '189',
      'HP':    '8'
    },
    {
      name:    'ES31 Stereo Panner Mixer',
      manu:    'Elby Designs',
      desc:    'Dual channel stereo panner mixer',
      'PRICE': '271',
      'HP':    '18 HP'
    },
    {
      name: 'Dual Quantizer',
      manu: 'Barton Musical Circuits',
      desc: 'Dual quantizer using 2 simple quantizer pcbs',
      'HP': '6'
    },
    {
      name:    'Atten-V',
      manu:    'PMFoundations',
      desc:    'Quad attenuator-inverter for Eurorack systems',
      'PRICE': '13',
      'HP':    '6'
    },
    {
      name:    'AM8008 SH05 VCO',
      manu:    'AMSynths',
      desc:    'Clone of Roland SH-5 VCO',
      'PRICE': '150',
      'HP':    '14'
    },
    {
      name:    'Phobos Lunar VCF',
      manu:    'Blue Lantern Modules',
      desc:    'Multimode Filter Module',
      'PRICE': '201',
      'HP':    '12'
    },
    {
      name:    'Mobula',
      manu:    'Delta Sound Labs',
      desc:    'Ring Modulator',
      'PRICE': '134',
      'HP':    '8'
    },
    {
      name:    'RS-60N',
      manu:    'Analogue Systems',
      desc:    'ADSR',
      'PRICE': '189',
      'HP':    '12'
    },
    {
      name:    'Dual Borg - Magpie white panel',
      manu:    'Malekko Heavy Industry',
      desc:    'Dual Multi-Mode Vactrol Filter/VCA',
      'PRICE': '290',
      'HP':    '16'
    },
    {
      name:    '3x ATT (white panel)',
      manu:    'ph modular',
      desc:    'Passive attenuator, with selector mode (LIN or LOG)',
      'PRICE': '37',
      'HP':    '4'
    },
    {
      name:    'Vollrausch',
      manu:    'Orpho',
      desc:    'Vacuum Tube VCO / Noise Generator',
      'PRICE': '184',
      'HP':    '6'
    },
    {
      name:    '2xVCA r2',
      manu:    'G-Storm Electro',
      desc:    'Dual Voltage Controlled Amplifier',
      'PRICE': '112',
      'HP':    '6'
    },
    {
      name:    'HG-30',
      manu:    'Audiospektri',
      desc:    'Harmonic generator/synthesizer/vocoder',
      'PRICE': '950',
      'HP':    '32 HP'
    },
    {
      name:    'ROLLOFF DJ EQ',
      manu:    'Snazzy FX',
      desc:    'EQ',
      'PRICE': '89',
      'HP':    '4'
    },
    {
      name:    'Dual Control Voltage Processor Model 156',
      manu:    'Tokyo Tape Music Center',
      desc:    'Control Voltage Processor',
      'PRICE': '204',
      'HP':    '14'
    },
    {
      name:    'SUBWAY',
      manu:    'CaviSynth',
      desc:    'DOUBLE VCO (VCO + SUB_VCO / LFO) inspired by the SH-101',
      'PRICE': '119',
      'HP':    '8'
    },
    {
      name: '4060E expander',
      manu: 'Olegtron',
      desc: 'Olegtron 4060E expander module',
      'HP': '4'
    },
    {
      name:    'ДИУ-32кб black',
      manu:    'Paratek',
      desc:    'Led VU meter',
      'PRICE': '107',
      'HP':    '4'
    },
    {
      name:    'Dodeca',
      manu:    'Neutron Sound',
      desc:    'Teensy based MIDI to CV converter',
      'PRICE': '89',
      'HP':    '6'
    },
    {
      name:    'Ian Fritz\'s Hypster - Magpie white panel',
      manu:    'Nonlinearcircuits',
      desc:    'An electronic fourth-order hyperchaos generator',
      'PRICE': '263',
      'HP':    '12'
    },
    {
      name: 'VCA',
      manu: 'ST Modular',
      desc: 'Simple VCA with two attenuated CV inputs',
      'HP': '3'
    },
    {
      name:    'RS-180N',
      manu:    'Analogue Systems',
      desc:    'VCA with logarithmic and linear inputs',
      'PRICE': '145',
      'HP':    '12'
    },
    {
      name:    'Multiple dual channel in two parts',
      manu:    'ph modular',
      desc:    'Passive multiple dual channel in two parts with led indicator',
      'PRICE': '60',
      'HP':    '6'
    },
    {
      name:    'STM32DUINO LFO (DIY)',
      manu:    'SoundForce',
      desc:    'Dual trigger / gate to CV',
      'PRICE': '35',
      'HP':    '10'
    },
    {
      name:    'Bytom (black panel)',
      manu:    'Xaoc Devices',
      desc:    'Optional accessory replacement panel.',
      'PRICE': '25',
      'HP':    '6 HP'
    },
    {
      name:    'Sum  Slew Mixer',
      manu:    'Stem Modular',
      desc:    '4hp 4 channel mixer/attenuator with slew limiting',
      'PRICE': '51',
      'HP':    '4'
    },
    {
      name:    'ENV-100',
      manu:    'Feedback',
      desc:    'The fastest envelope generator in Modularland.',
      'PRICE': '45',
      'HP':    '6'
    },
    {
      name: 'Blind Panel',
      manu: 'Der Mann mit der Maschine',
      desc: 'Blind Panel with Der Mann mit der Maschine Logo',
      'HP': '1'
    },
    {
      name:    'uT_u',
      manu:    'After Later Audio',
      desc:    'A smaller version of the Temps Utile designed by mxmxmx with Magpie panel',
      'PRICE': '176',
      'HP':    '8'
    },
    {
      name:    'Skorn da Bask - Black panel',
      manu:    'TouellSkouarn',
      desc:    'Drone, Filter  Abstract Rhythm Generator',
      'PRICE': '379',
      'HP':    '16'
    },
    {
      name:    'Black BBD',
      manu:    'Erica Synths',
      desc:    'Dual tap analogue delay',
      'PRICE': '260',
      'HP':    '12'
    },
    {
      name:    'Capsule Titan Modules',
      manu:    'Eowave',
      desc:    '2 Osc synth voice comprised of 7 modules',
      'PRICE': '599',
      'HP':    '40 HP'
    },
    {
      name:    'AM8075',
      manu:    'AMSynths',
      desc:    'AM8075 Odyssey III VCF',
      'PRICE': '190',
      'HP':    '16'
    },
    {
      name:    '5823 Noise Sorcerer',
      manu:    'Zerosum Inertia',
      desc:    'Oscillating noise source generated by 5823 thyratron',
      'PRICE': '326',
      'HP':    '8'
    },
    {
      name:    'm12 Detektor',
      manu:    'Trogotronic',
      desc:    'Quad decay envelope',
      'PRICE': '148',
      'HP':    '9'
    },
    {
      name:    'Model 156V CV Processor',
      manu:    'Catalyst Audio',
      desc:    'CV Processor',
      'PRICE': '265',
      'HP':    '14'
    },
    {
      name:    'Teenage Engineering PO35 speak',
      manu:    'LPZW.modules',
      desc:    'Eurorack converted Pocket Operator Speech Synthesizer',
      'PRICE': '150',
      'HP':    '12'
    },
    {
      name:    'raw spring -smooth pinky-',
      manu:    'Error Instruments',
      desc:    'hands on acoustic interface',
      'PRICE': '34',
      'HP':    '3'
    },
    {
      name:    'CATCH VCF-A',
      manu:    'ReBach',
      desc:    'CATCH series 12db/oct 2 Pole Low Pass filter',
      'PRICE': '95',
      'HP':    '8'
    },
    {
      name:    'SYS-100 VCO',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-101/102 VCO',
      'PRICE': '185',
      'HP':    '12'
    },
    {
      name:    'SYS-100 LFO',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-101/102 LFO',
      'PRICE': '101',
      'HP':    '6'
    },
    {
      name:    'Asteroid Snare Drum Black',
      manu:    'Blue Lantern Modules',
      desc:    'Snare Drum Module',
      'PRICE': '151',
      'HP':    '16'
    },
    {
      name: 'Nozori double expansion board',
      manu: 'Nozo&iuml;d',
      desc: '2 DIP switch groups to change functions on 2 Nozori modules',
      'HP': '2'
    },
    {
      name:    'SYS-700 VCA 704',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s VCA 704',
      'PRICE': '170',
      'HP':    '12'
    },
    {
      name:    '&sum;42',
      manu:    'Vermona',
      desc:    'Audio / CV mixer',
      'PRICE': '139',
      'HP':    '6'
    },
    {
      name:    'Dual VCO',
      manu:    'Oakley',
      desc:    'Two classic sawtooth core oscillators',
      'PRICE': '200',
      'HP':    '14'
    },
    {
      name:    'Cells - expander for Lattice',
      manu:    'Tenderfoot Electronics',
      desc:    'Expander for Lattice sequencer',
      'PRICE': '258',
      'HP':    '16'
    },
    {
      name:    'СИУ-1ч',
      manu:    'Paratek',
      desc:    'Analog VU-meter',
      'PRICE': '185',
      'HP':    '8'
    },
    {
      name:    'PARATEK ДИУ-3к black',
      manu:    'Paratek',
      desc:    'Led VU meter',
      'PRICE': '130',
      'HP':    '4'
    },
    {
      name:    'Fuzzbucket',
      manu:    'synthCube',
      desc:    'Fuzz and delay',
      'PRICE': '115',
      'HP':    '8'
    },
    {
      name:    'Voltage Controlled Annihilation',
      manu:    'Zerosum Inertia',
      desc:    'Tube VCA/neon lamp distortion',
      'PRICE': '357',
      'HP':    '10'
    },
    {
      name: 'RIAA',
      manu: 'Seismic Industries',
      desc: 'Phono preamplifier',
      'HP': '4'
    },
    {
      name:    'ViceEtVersa',
      manu:    'WaveLicker',
      desc:    'Dual Flip-Flop, Clock Divider, sub-octaver',
      'PRICE': '60',
      'HP':    '4'
    },
    {
      name:    'ASM316 - Dual VCA',
      manu:    'Elby Designs',
      desc:    '',
      'PRICE': '103',
      'HP':    '12'
    },
    {
      name:    'STEPS',
      manu:    'Noise Reap',
      desc:    '4 Step CV / Gate Sequencer',
      'PRICE': '55',
      'HP':    '8'
    },
    {
      name:    'm4 / Button Array Controller',
      manu:    'Trogotronic',
      desc:    'm/4 Quad Channel Breakout Control Module for m/12 Detektor',
      'PRICE': '32',
      'HP':    '4'
    },
    {
      name:    '101-VCF',
      manu:    'G-Storm Electro',
      desc:    'Roland SH-101 Filter Adaptation',
      'PRICE': '204',
      'HP':    '8'
    },
    {
      name:    'RS-380N (Dual Bus)',
      manu:    'Analogue Systems',
      desc:    'LFO / Noise / SH / VCA',
      'PRICE': '209',
      'HP':    '12'
    },
    {
      name:    'Atari DRUM console duo NO DRUM !',
      manu:    'Error Instruments',
      desc:    'Chiptune to crunchy bass sound',
      'PRICE': '89',
      'HP':    '10'
    },
    {
      name:    'SAR',
      manu:    'Takaab',
      desc:    'Gate Controlled Lag Generator (Slide / AR Envelope)',
      'PRICE': '54',
      'HP':    '6'
    },
    {
      name:    'Sly Grogan - Magpie Black Panel',
      manu:    'Nonlinearcircuits',
      desc:    'Ringing transient envelope generator',
      'PRICE': '152',
      'HP':    '8'
    },
    {
      name: 'DA',
      manu: 'ST Modular',
      desc: 'Dual Attenuverter and Offset',
      'HP': '3'
    },
    {
      name:    'Tomo',
      manu:    'Error Instruments',
      desc:    'Touch interface  CV / Gate Controller',
      'PRICE': '59',
      'HP':    '12'
    },
    {
      name:    'ATT-1 Attenuverter',
      manu:    'Skull  Circuits',
      desc:    'Quad Attenuverter',
      'PRICE': '67',
      'HP':    '8'
    },
    {
      name: 'KS-20 Filter (Vintagelavalamp Black Panel)',
      manu: 'Kassutronics',
      desc: 'MS-20 style VCF',
      'HP': '8'
    },
    {
      name:    'OCTOROT SUPREME',
      manu:    'Mazzatron',
      desc:    '8-Channel Signal Rotator',
      'PRICE': '204',
      'HP':    '20'
    },
    {
      name: 'Gritzner',
      manu: 'ST Modular',
      desc: 'PT2399 Delay with two Switchable Inputs and Internal LFO',
      'HP': '8'
    },
    {
      name:    'Dragon-FLY',
      manu:    'kNoB technology',
      desc:    'Stereo Filter Frequency Scanner and VCA by kNoB technology',
      'PRICE': '278',
      'HP':    '18 HP'
    },
    {
      name:    'Metal noise designer',
      manu:    'Orpho',
      desc:    'Six mixed oscillators',
      'PRICE': '69',
      'HP':    '6'
    },
    {
      name:    'Mini Shimmery MK2',
      manu:    'Blue Lantern Modules',
      desc:    'Percussive Metallic Generator',
      'PRICE': '116',
      'HP':    '10'
    },
    {
      name:    'Multiwave Digital Oscillator',
      manu:    'EMW',
      desc:    'MIDI-Controlled Digital Oscillator',
      'PRICE': '263',
      'HP':    '18'
    },
    {
      name:    'Polyphonic MIDI to CV',
      manu:    'ACXSynth',
      desc:    'Polyphonic MIDI to CV / Gate interface',
      'PRICE': '189',
      'HP':    '10 HP'
    },
    {
      name:    'RK004',
      manu:    'Retrokits',
      desc:    'MIDI Merger/Splitter/Sync/Clock Processor',
      'PRICE': '180',
      'HP':    '18'
    },
    {
      name:    'Synthola +8 steps',
      manu:    'PMFoundations',
      desc:    'Additional 8 steps for the Synthola sequencer',
      'PRICE': '19',
      'HP':    '6'
    },
    {
      name:    'B-030',
      manu:    'Ladik',
      desc:    'Five Input Majority Logic Module',
      'PRICE': '56',
      'HP':    '4'
    },
    {
      name: 'BMC49 Attenuverting Mixer',
      manu: 'Barton Musical Circuits',
      'HP': '8'
    },
    {
      name:    'XEnvelope',
      manu:    'Qosmo Modular',
      desc:    'Voltage Controlled AHR/AHDSR Envelope Generator',
      'PRICE': '245',
      'HP':    '12'
    },
    {
      name:    'Dual Offset Processor',
      manu:    'EMW',
      desc:    '-/+ 10V dual offset generator w/ CV modulator inputs',
      'PRICE': '79',
      'HP':    '10'
    },
    {
      name:    'TPC SLIM VCO',
      manu:    'Blue Lantern Modules',
      desc:    'ANALOG OSCILLATOR, SOUND SOURCE, LFO',
      'PRICE': '258',
      'HP':    '12'
    },
    {
      name:    '8 Bit Cipher - Magpie white panel',
      manu:    'Nonlinearcircuits',
      desc:    'Random Gate  Voltage source',
      'PRICE': '179',
      'HP':    '10'
    },
    {
      name:    'Quantoct Quad Quantizer',
      manu:    'PMFoundations',
      desc:    'Four channel quantizer',
      'PRICE': '31',
      'HP':    '8'
    },
    {
      name:    'BLM JFET VCO',
      manu:    'Blue Lantern Modules',
      desc:    'Matt Black Jupiter-influenced saw core VCO',
      'PRICE': '121',
      'HP':    '6'
    },
    {
      name:    'zLFO',
      manu:    'Motovilo',
      desc:    'Wavetable VCLFO with self-modulation by an internal auxiliary LFO ',
      'PRICE': '170',
      'HP':    '8'
    },
    {
      name:    'PANIC !',
      manu:    'Error Instruments',
      desc:    'Unexpected pulse generator',
      'PRICE': '149',
      'HP':    '6'
    },
    {
      name: 'Shelves Expander (PCB Panel)',
      manu: 'Oscillosaurus',
      desc: 'Alternative Black PCB Panel for Shelves Expander.',
      'HP': '4'
    },
    {
      name:    'Analog bass drum',
      manu:    'ph modular',
      desc:    'Inspired by Craig Anderton\'s HBD, a powerful versatile kick',
      'PRICE': '82',
      'HP':    '8'
    },
    {
      name:    'KRUSNEK FORST EURORACK',
      manu:    'Error Instruments',
      desc:    'Psychedelic synthesizer / controller',
      'PRICE': '299',
      'HP':    '20'
    },
    {
      name:    'Leopard',
      manu:    'Doboz',
      desc:    'Triple Attenuator',
      'PRICE': '19',
      'HP':    '4'
    },
    {
      name:    'Lucky Voltages',
      manu:    'Radical Frequencies',
      desc:    '4 Different Noises - Sample  Hold - Sample  Slew - Random Gates - Clock Generator',
      'PRICE': '170',
      'HP':    '14'
    },
    {
      name: 'Path',
      manu: 'ST Modular',
      desc: 'Dual Sequential Switch',
      'HP': '8'
    },
    {
      name:    'SYS-700 VCF 703C',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s VCF 703C (12dB multimode).',
      'PRICE': '205',
      'HP':    '16'
    },
    {
      name:    'Noizes',
      manu:    'DD Modules',
      desc:    'Noise module (White, Pink and Red)',
      'PRICE': '95',
      'HP':    '6'
    },
    {
      name:    '(Black) Bang',
      manu:    'Livestock Electronics',
      desc:    'Wavetable Oscillator',
      'PRICE': '231',
      'HP':    '10'
    },
    {
      name:    'JS-1 Joystick',
      manu:    'Mazzatron',
      desc:    'Joystick Controller',
      'PRICE': '115',
      'HP':    '12'
    },
    {
      name:    'MCVC: 4 Voice MIDI CV Converter',
      manu:    'Majella Audio',
      desc:    'MIDI to CV converter',
      'PRICE': '219',
      'HP':    '14'
    },
    {
      name:    'ADSR',
      manu:    'Manikk',
      desc:    'Advanced envelope generator',
      'PRICE': '199',
      'HP':    '4'
    },
    {
      name:    'FUZZ-1',
      manu:    'Skull  Circuits',
      desc:    'Passive Fuzz module',
      'PRICE': '49',
      'HP':    '4'
    },
    {
      name:    'ТАКТОМЕR-2д12 black',
      manu:    'Paratek',
      desc:    'Gate counter, clock generator',
      'PRICE': '134',
      'HP':    '9'
    },
    {
      name:    'VC122',
      manu:    'Gieskes',
      desc:    'Small DC Motor Driver',
      'PRICE': '38',
      'HP':    '4'
    },
    {
      name:    'A-535 Gain Up! (Black)',
      manu:    'Ladik',
      desc:    'Dual Amplifier',
      'PRICE': '50',
      'HP':    '4'
    },
    {
      name:    '2VCA',
      manu:    'Motovilo',
      desc:    'Dual linear VCA',
      'PRICE': '74',
      'HP':    '4'
    },
    {
      name:    'SVF-1',
      manu:    'Tenderfoot Electronics',
      desc:    'SVF-1 State Variable Filter',
      'PRICE': '184',
      'HP':    '8'
    },
    {
      name:    '4023 VCF Aluminum',
      manu:    'G-Storm Electro',
      desc:    'ARP Odyssey MK1 Two-Pole Filter Adaptation',
      'PRICE': '144',
      'HP':    '8'
    },
    {
      name:    'S-280',
      manu:    'Ladik',
      desc:    'Dual 8-step CV and Gate / Trigger Sequencer',
      'PRICE': '244',
      'HP':    '32'
    },
    {
      name:    'St. Tropez',
      manu:    'LA Circuits',
      desc:    'EM-301 | Dual-Input VCA',
      'PRICE': '145',
      'HP':    '10'
    },
    {
      name:    'RCDBO - Black Panel (Inc DIY Kit)',
      manu:    '4ms Company',
      desc:    'DIY kit and black replacement faceplate for the Rotating Clock Divider Break Out ',
      'PRICE': '60',
      'HP':    '4'
    },
    {
      name:    'LDRama',
      manu:    'Nonlinearcircuits',
      desc:    'Generates CVs from images on your phone',
      'PRICE': '296',
      'HP':    '28'
    },
    {
      name:    'Analog Kick (3HP)',
      manu:    'Recovery Effects and Devices',
      desc:    '',
      'PRICE': '73',
      'HP':    '3'
    },
    {
      name:    'AM8005 Diode Multi Mode VCF',
      manu:    'AMSynths',
      desc:    'AM8005 Diode Multi Mode VCF',
      'PRICE': '150',
      'HP':    '16'
    },
    {
      name:    'Gatling Clock',
      manu:    'Analog Ordnance',
      desc:    '6X Clock Generators',
      'PRICE': '134',
      'HP':    '12'
    },
    {
      name:    'STEINER NOISE GENERATOR',
      manu:    'synthCube',
      desc:    'white or pink noise or a mix',
      'PRICE': '107',
      'HP':    '6'
    },
    {
      name:    'Alias 3',
      manu:    'Beast-Tek',
      desc:    'Weird Arpeggio LO-FI VCO',
      'PRICE': '135',
      'HP':    '8'
    },
    {
      name:    'VCF S100',
      manu:    'EMW',
      desc:    'Roland style 24db/oct low-pass resonant filter',
      'PRICE': '139',
      'HP':    '10'
    },
    {
      name:    'XPulser',
      manu:    'Qosmo Modular',
      desc:    'Voltage Controlled Oscillator',
      'PRICE': '280',
      'HP':    '14'
    },
    {
      name: 'Neo Mixer',
      manu: 'Circuit Abbey',
      desc: 'Matrix Mixer',
      'HP': '20'
    },
    {
      name:    'zADSR',
      manu:    'Motovilo',
      desc:    'Digital multi-mode envelope generator',
      'PRICE': '176',
      'HP':    '8'
    },
    {
      name:    'HI-FUSION VCF',
      manu:    'Feedback',
      desc:    'Redesign of a classic high pass OTA VCF.',
      'PRICE': '90',
      'HP':    '10'
    },
    {
      name: 'Delay No More',
      manu: 'Nonlinearcircuits',
      desc: 'Magpie Black Panel',
      'HP': '8'
    },
    {
      name:    'AVS-LFO-1',
      manu:    'AvonSynth',
      desc:    'Dual Low Frequency Oscillator',
      'PRICE': '85',
      'HP':    '6'
    },
    {
      name:    'SYS-100 VCA',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-101/102 VCA',
      'PRICE': '118',
      'HP':    '6'
    },
    {
      name:    'GЛИТЧ-2 aluminium',
      manu:    'Paratek',
      desc:    'Analog signal visualisation unit',
      'PRICE': '89',
      'HP':    '6'
    },
    {
      name: 'LFOR',
      manu: 'ST Modular',
      desc: 'Digital LFO and Stepped Random Generator',
      'HP': '4'
    },
    {
      name:    'Transistor-82',
      manu:    'G-Storm Electro',
      desc:    'Drumfire Lo-Fi Analog Percussion Voice Adaptation',
      'PRICE': '162',
      'HP':    '14'
    },
    {
      name:    '984 Four Channel Mixer',
      manu:    'Aion Modular',
      desc:    'Four Channel Audio Mixer',
      'PRICE': '485',
      'HP':    '36'
    },
    {
      name:    'СИУ-37',
      manu:    'Paratek',
      desc:    'Analog VU-meter',
      'PRICE': '125',
      'HP':    '8'
    },
    {
      name:    'Crossfade',
      manu:    'brownshoesonly',
      desc:    'THREE CHANNEL CROSSFADER / VCA',
      'PRICE': '185',
      'HP':    '8'
    },
    {
      name: 'ADDAC402B Euclidean Midi I/O Expansion',
      manu: 'ADDAC System',
      desc: 'Expansion for the ADDAC402 4 Voice Euclidean Rhythm Generator',
      'HP': '6'
    },
    {
      name:    'Wavefolder',
      manu:    'Klangbau K&ouml;ln',
      desc:    'Wavefolder with built-in VCA',
      'PRICE': '120',
      'HP':    '9'
    },
    {
      name:    'DIY Bend',
      manu:    'Eowave',
      desc:    'The DIY Bend kit is a fun way to bring touch sensitivity into your modular instrument.',
      'PRICE': '59',
      'HP':    '4'
    },
    {
      name:    'CGS736 - Pulse Divider',
      manu:    'Elby Designs',
      desc:    'Pulse divider and subharmonic generator',
      'PRICE': '171',
      'HP':    '14'
    },
    {
      name:    'OM-02',
      manu:    'Orpho',
      desc:    'Orpho Modular Snare Drum',
      'PRICE': '79',
      'HP':    '6'
    },
    {
      name: 'DELAY NO MORE Clark 68 panel',
      manu: 'Nonlinearcircuits',
      desc: 'DELAY NO MORE, CLARKE68 PANEL',
      'HP': '8'
    },
    {
      name:    'zSUM-1A',
      manu:    'Motovilo',
      desc:    'Line summing mixer/attenuator/inverter',
      'PRICE': '54',
      'HP':    '3'
    },
    {
      name:    'Sonic Lullaby NOIR II',
      manu:    'Error Instruments',
      desc:    '',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name: 'GIVE',
      manu: 'ST Modular',
      desc: 'Classic Analog VCO with Waveshaper',
      'HP': '14'
    },
    {
      name:    'IPS2',
      manu:    'Seismic Industries',
      desc:    'the infamous power supply is back! :)',
      'PRICE': '97',
      'HP':    '2'
    },
    {
      name:    '4xDecay',
      manu:    'Barton Musical Circuits',
      desc:    'Barton\'s Quad Decay module (6hp)',
      'PRICE': '99',
      'HP':    '6'
    },
    {
      name:    'Median',
      manu:    'Ladik',
      desc:    'Median module (middle value selector)',
      'PRICE': '62',
      'HP':    '4'
    },
    {
      name:    'Acoustic Echoes gold',
      manu:    'Error Instruments',
      desc:    'music box / acoustic delay',
      'PRICE': '169',
      'HP':    '10'
    },
    {
      name: 'Analog /FM Drum',
      manu: 'Barton Musical Circuits',
      'HP': '8'
    },
    {
      name:    'BUFFERS',
      manu:    'JPSynth',
      desc:    'Buffered Multiples',
      'PRICE': '65',
      'HP':    '4'
    },
    {
      name:    'FFB914 Silver',
      manu:    'AJH Synth',
      desc:    '14 Band Inductor based Fixed Filter Bank',
      'PRICE': '529',
      'HP':    '30'
    },
    {
      name:    'U-081 (Custom Black Panel)',
      manu:    'Ladik',
      desc:    'CV Fader',
      'PRICE': '52',
      'HP':    '4'
    },
    {
      name:    'SYS-700 LFO 706',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s VC LFO 706',
      'PRICE': '170',
      'HP':    '12'
    },
    {
      name:    'РЗРВ aluminium black buchla knobs',
      manu:    'Paratek',
      desc:    'random gater-interruptor',
      'PRICE': '107',
      'HP':    '4'
    },
    {
      name:    'Dual Reverberator MODEL 990',
      manu:    'Tokyo Tape Music Center',
      desc:    'Dual Spring Reverb',
      'PRICE': '321',
      'HP':    '14'
    },
    {
      name:    'Ex 2hp - Silver Panel',
      manu:    'Plum Audio',
      desc:    'Apex / Pique expander',
      'PRICE': '44',
      'HP':    '2'
    },
    {
      name:    'Discrete Ladder Filter',
      manu:    'Oakley',
      desc:    'Compact CP3 and 904A inspired filter module',
      'PRICE': '120',
      'HP':    '6'
    },
    {
      name:    'euEM2',
      manu:    'Northern Light Modular',
      desc:    'Extended rackmount version of the Evenmidi controller with 10 attenuverted CV inputs -...',
      'PRICE': '350',
      'HP':    '18'
    },
    {
      name:    'MiniMix(Soulless panel)',
      manu:    'Złob',
      desc:    'USER CONFIGURABLE 3 CHANNEL MIXER',
      'PRICE': '69',
      'HP':    '2'
    },
    {
      name:    '3340 Low-Frequency Oscillator (LFO)',
      manu:    'Wavefonix',
      desc:    'LFO with CEM3340 Architecture',
      'PRICE': '124',
      'HP':    '10'
    },
    {
      name: 'BE2N - black mirror panel',
      manu: 'Jolin Lab',
      desc: 'Dual Specular Benjolin',
      'HP': '22'
    },
    {
      name:    'QPC-2 Quadraphonic Controller',
      manu:    'Mazzatron',
      desc:    'CV Quadraphonic Controller',
      'PRICE': '169',
      'HP':    '6'
    },
    {
      name:    'BLM Accented Asteroid BD 2020',
      manu:    'Blue Lantern Modules',
      desc:    '808 Bass Drum and Toms',
      'PRICE': '125',
      'HP':    '6'
    },
    {
      name:    'OCTOROT',
      manu:    'Mazzatron',
      desc:    '8-Channel Signal Rotator',
      'PRICE': '169',
      'HP':    '20'
    },
    {
      name:    'MFOS Mixer',
      manu:    'MFOS',
      desc:    'MFOS Mixer',
      'PRICE': '92',
      'HP':    '8'
    },
    {
      name:    'MULTATULI',
      manu:    'Error Instruments',
      desc:    'Simple mult 2&times;4 or 1x8',
      'PRICE': '27',
      'HP':    '3'
    },
    {
      name: 'SWT16+ MIDI Expander',
      manu: 'Robaux',
      desc: 'Robaux SWT16+ MIDI Expander',
      'HP': '4'
    },
    {
      name:    '1050 Mixer',
      manu:    'Nonlinearcircuits',
      desc:    'Sequencer, mixer, sequential switch, rectifier (black)',
      'PRICE': '174',
      'HP':    '16'
    },
    {
      name:    '3340 Voltage-Controlled Oscillator (VCO)',
      manu:    'Wavefonix',
      desc:    'VCO with CEM3340 Architecture',
      'PRICE': '152',
      'HP':    '13'
    },
    {
      name:    'Kick Drum 2 (Black Line)',
      manu:    'Orpho',
      desc:    'Orpho Modular Kick Drum 2',
      'PRICE': '69',
      'HP':    '6'
    },
    {
      name:    'Thomas Henry 555-VCO',
      manu:    'Fonitronik',
      desc:    'analogue VCO using easy to find parts with a distinctive sync sound thanks to the use...',
      'PRICE': '125',
      'HP':    '10'
    },
    {
      name: 'Klacking Keypad (Black)',
      manu: 'North Coast Modular Collective',
      desc: 'The Klacking Keypad is a tactile momentary gate user interface that can send gates or...',
      'HP': '14'
    },
    {
      name:    'ED103 - MIDI Trigger',
      manu:    'Elby Designs',
      desc:    'Midi to trigger module',
      'PRICE': '182',
      'HP':    '11'
    },
    {
      name: 'Guitar Input',
      manu: 'Barton Musical Circuits',
      'HP': '12'
    },
    {
      name:    'Multi LFO Noise (Aluminium)',
      manu:    'EMW',
      desc:    '',
      'PRICE': '64',
      'HP':    '6'
    },
    {
      name:    'ED722 - Slow Oscillator',
      manu:    'Elby Designs',
      desc:    '',
      'PRICE': '85',
      'HP':    '7'
    },
    {
      name:    'Sonic Lullaby WOOD',
      manu:    'Error Instruments',
      desc:    'music box module',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name: 'BMC049 - Barton Attenuverting Mixer',
      manu: 'Barton Musical Circuits',
      desc: 'DC coupled, four channel attenuverting mixer',
      'HP': '8'
    },
    {
      name:    'rLPF',
      manu:    'York Modular',
      desc:    '2hp Sallen-Key Low Pass Filter',
      'PRICE': '27',
      'HP':    '2'
    },
    {
      name:    'SOLAR v3 THEREMIN',
      manu:    'Error Instruments',
      desc:    'Light-sensitive controller',
      'PRICE': '35',
      'HP':    '11'
    },
    {
      name:    'Alchemical Audio Touch Controller',
      manu:    'Rat King Modular',
      desc:    'Eurorack or standalone touch keyboard with portamento and pitch bend controls ',
      'PRICE': '246',
      'HP':    '60'
    },
    {
      name:    'Illyana',
      manu:    'Omiindustriies',
      desc:    'Dual Boolean logic module with hard and programmable logic',
      'PRICE': '223',
      'HP':    '8'
    },
    {
      name:    'Analog Bass Drum black panel',
      manu:    'ph modular',
      desc:    'Inspired by Craig Anderton\'s HBD, a powerful versatile kick',
      'PRICE': '82',
      'HP':    '8'
    },
    {
      name:    'Multiple dual channel white panel',
      manu:    'ph modular',
      desc:    'Passive multiple dual channels with led indicator',
      'PRICE': '55',
      'HP':    '6'
    },
    {
      name:    'Cydonia VCF',
      manu:    'Blue Lantern Modules',
      desc:    'Stereo Analog Filter',
      'PRICE': '338',
      'HP':    '12'
    },
    {
      name:    'PitchMaster',
      manu:    'Hinton Instruments',
      desc:    'A master Pitch CV reference for VCO calibration and control',
      'PRICE': '460',
      'HP':    '12'
    },
    {
      name:    'Slew',
      manu:    'PMFoundations',
      desc:    'Dual Slew Limiter Eurorack PCB Set',
      'PRICE': '13',
      'HP':    '4'
    },
    {
      name:    'BFR-1 Buffered Multiple',
      manu:    'Skull  Circuits',
      desc:    '1 In to 3 Out Buffered Multiple',
      'PRICE': '31',
      'HP':    '4'
    },
    {
      name: 'Quantizer (Vintagelavalamp Black Panel)',
      manu: 'Kassutronics',
      desc: 'Two channel cyclic quantizer',
      'HP': '10'
    },
    {
      name:    'MFOS ADSR',
      manu:    'MFOS',
      desc:    'MFOS ADSR',
      'PRICE': '106',
      'HP':    '8'
    },
    {
      name:    'Journeyman',
      manu:    'Oakley',
      desc:    'Diode Ring Filter',
      'PRICE': '150',
      'HP':    '6'
    },
    {
      name:    'Sputnik Radio WHITE',
      manu:    'Error Instruments',
      desc:    'Voice sound source for experimental purposes who is based and inspired by radiowave ...',
      'PRICE': '210',
      'HP':    '11'
    },
    {
      name:    'F-510 Synare VCF',
      manu:    'Ladik',
      desc:    'Synare filter (Juno 6/106)',
      'PRICE': '75',
      'HP':    '8'
    },
    {
      name:    'Continuum Phaser II (silver)',
      manu:    'Frequency Central',
      desc:    '4 stage Phaser',
      'PRICE': '170',
      'HP':    '12'
    },
    {
      name:    'Quad AAF (BLACK)',
      manu:    'WMD',
      desc:    'Quad anti-aliasing filter',
      'PRICE': '212',
      'HP':    '4'
    },
    {
      name:    'Sol (black panel)',
      manu:    'Winterbloom',
      desc:    'Programmable USB MIDI to CV/Gate module',
      'PRICE': '175',
      'HP':    '8'
    },
    {
      name:    'Quad Audio AC Coupler',
      manu:    'Mazzatron',
      desc:    'Quad Audio AC Coupler',
      'PRICE': '27',
      'HP':    '2'
    },
    {
      name:    'DALPG',
      manu:    'kNoB technology',
      desc:    'Three-mode Dual Active Low Pass Gate by kNoB technology',
      'PRICE': '46',
      'HP':    '2'
    },
    {
      name:    'uNimbus',
      manu:    'Codex Modulex',
      desc:    'Clouds Clone',
      'PRICE': '190',
      'HP':    '10 HP'
    },
    {
      name:    'uPeaks (Silver)',
      manu:    'CalSynth',
      desc:    '4hp Mutable Peaks',
      'PRICE': '129',
      'HP':    '4'
    },
    {
      name:    'Eowave Kit DIY Eurorack 2 &eacute;tages',
      manu:    'Eowave',
      desc:    'power 2HP',
      'PRICE': '135',
      'HP':    '2'
    },
    {
      name:    'K-011 Trig to keyboard',
      manu:    'Ladik',
      desc:    'K-011 Trig to keyboard extension module for K-010 Utility CV keyboard',
      'PRICE': '80',
      'HP':    '8'
    },
    {
      name:    'ES202 - Resonant Equalizer',
      manu:    'Elby Designs',
      desc:    'Resonant Equalizer',
      'PRICE': '285',
      'HP':    '32'
    },
    {
      name:    'MIDI MIXER',
      manu:    'EMW',
      desc:    '2-in 1-out MIDI merge module',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name:    'SHRAPNEL',
      manu:    'Analog Ordnance',
      desc:    'Shrapnel Shaper is a Vactrol based, Voltage controllable passive slew / gate shaper',
      'PRICE': '49',
      'HP':    '4'
    },
    {
      name:    'skull  bones spikes',
      manu:    'Error Instruments',
      desc:    'Module with 14 touch points - extra long spikes (30mm)',
      'PRICE': '241',
      'HP':    '20'
    },
    {
      name:    'Starving Binary',
      manu:    'Gieskes',
      desc:    'Clock Divider',
      'PRICE': '65',
      'HP':    '4'
    },
    {
      name: 'Mutant Hot Glue (black)',
      manu: 'Hexinverter &Eacute;lectronique',
      'HP': '24 HP'
    },
    {
      name:    'AVS-VCF-1',
      manu:    'AvonSynth',
      desc:    'Voltage Controlled State-Variable Filter',
      'PRICE': '135',
      'HP':    '10'
    },
    {
      name:    'm/15 Inlet Power Module',
      manu:    'Trogotronic',
      desc:    'AC Inlet Module w/ Triple Voltage Status Lights',
      'PRICE': '60',
      'HP':    '11'
    },
    {
      name:    'FleXi blind panel - BLACK - L (24 - 48HP)',
      manu:    'Konstant Lab',
      desc:    '...Fill each empty space in your modular synth...',
      'PRICE': '18',
      'HP':    '48'
    },
    {
      name:    'ТАКТОМЕR-3д black',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '152',
      'HP':    '8'
    },
    {
      name: 'Plagwitz Expander',
      manu: 'LPZW.modules',
      desc: 'Passive input expander for the Plagwitz Mk2',
      'HP': '2'
    },
    {
      name:    'sequencemix',
      manu:    'Hinton Instruments',
      desc:    'eight channel switched mixer controlled by a rotating shift register',
      'PRICE': '650',
      'HP':    '26'
    },
    {
      name:    'Mod+',
      manu:    'PMFoundations',
      desc:    'Versatile modulation controller with LFO, SH and Noise in 6HP Eurorack',
      'PRICE': '18',
      'HP':    '6'
    },
    {
      name:    'Triple Vactrol Resonators XS (Eurorack DIY)',
      manu:    'Fonitronik',
      desc:    'PS3100 Resonator in 12 HP Eurorack Format',
      'PRICE': '124',
      'HP':    '12'
    },
    {
      name: 'IN/OUT',
      manu: 'L-1',
      desc: 'Insert expander module for the Discrete VC Stereo Mixer',
      'HP': '4'
    },
    {
      name:    'РИТМИКС aluminium',
      manu:    'Paratek',
      desc:    '8 channels mixer unit',
      'PRICE': '179',
      'HP':    '12 HP'
    },
    {
      name:    'VCA',
      manu:    'Tenderfoot Electronics',
      desc:    '3 - Channel chainable mixing VCA',
      'PRICE': '134',
      'HP':    '10'
    },
    {
      name:    'Expander A1',
      manu:    'midiphy',
      desc:    'midiphy CV expander',
      'PRICE': '100',
      'HP':    '6'
    },
    {
      name:    'Osem',
      manu:    '5540lab',
      desc:    'Dual splitter',
      'PRICE': '14',
      'HP':    '2'
    },
    {
      name:    'Heaven 16',
      manu:    'DD Modules',
      desc:    'A versatile dual 8 steps or single 16 steps Sequencer',
      'PRICE': '333',
      'HP':    '27 HP'
    },
    {
      name:    'LPG',
      manu:    '5540lab',
      desc:    'Dual passive Low Pass Gate',
      'PRICE': '19',
      'HP':    '2'
    },
    {
      name: '4HP Blank Panel',
      manu: 'Frequency Central',
      desc: '4HP Blank Panel with HP ruler',
      'HP': '4'
    },
    {
      name:    'ADDAC807C+',
      manu:    'ADDAC System',
      desc:    'ADDAC807C Individual Channel Stereo Outputs Expansion',
      'PRICE': '60',
      'HP':    '2'
    },
    {
      name: 'BE2N - white mirror panel',
      manu: 'Jolin Lab',
      desc: 'Dual Specular Benjolin',
      'HP': '22'
    },
    {
      name:    'DPLPG',
      manu:    'kNoB technology',
      desc:    'Three-mode Dual Passive Low Pass Gate by kNoB technology',
      'PRICE': '37',
      'HP':    '2'
    },
    {
      name:    'Pepper Rev2',
      manu:    'Rebel Technology',
      desc:    'DIY Eurorack module for Bela',
      'PRICE': '249',
      'HP':    '18'
    },
    {
      name:    'Strakal Silisiom',
      manu:    'TouellSkouarn',
      desc:    'Dual fuzz/overdrive with morphing',
      'PRICE': '265',
      'HP':    '8'
    },
    {
      name:    'Micro Streams',
      manu:    'Michigan Synth Works',
      desc:    'Mutable Streams in 8HP',
      'PRICE': '185',
      'HP':    '8'
    },
    {
      name:    'ECTO PLASM NOIR',
      manu:    'Error Instruments',
      desc:    'ECTO PLASM NOIR ! only 10 made',
      'PRICE': '169',
      'HP':    '10'
    },
    {
      name:    'Expander D1',
      manu:    'midiphy',
      desc:    'midiphy gates expander',
      'PRICE': '75',
      'HP':    '4'
    },
    {
      name:    'CV Quad Slew',
      manu:    'Mazzatron',
      desc:    'Quad Voltage Controlled Slew Limiter',
      'PRICE': '160',
      'HP':    '8'
    },
    {
      name:    'Attenuverter',
      manu:    'Schenktronics',
      desc:    'Quad Attenuverter',
      'PRICE': '89',
      'HP':    '6'
    },
    {
      name:    '3310 Envelope Generator (EG)',
      manu:    'Wavefonix',
      desc:    'Envelope Generator (EG) with AS3310 Architecture',
      'PRICE': '83',
      'HP':    '9'
    },
    {
      name:    'RCVS-4',
      manu:    'ACL',
      desc:    'Quad rotary knob CV source',
      'PRICE': '100',
      'HP':    '6'
    },
    {
      name:    'U-120 Pedal Control',
      manu:    'Ladik',
      desc:    'U-120 Pedal Control module module for Eurorack / Doepfer A100 system.',
      'PRICE': '57',
      'HP':    '4'
    },
    {
      name:    '4x4 Buffered Multiple (BM)',
      manu:    'Wavefonix',
      desc:    'Buffered Multiple Featuring Four Groups',
      'PRICE': '83',
      'HP':    '7'
    },
    {
      name:    'Jacks',
      manu:    'Synovatron',
      desc:    '1/4&rdquo; to 3.5mm jack adaptor module',
      'PRICE': '30',
      'HP':    '4'
    },
    {
      name:    'Gain Invert Offset',
      manu:    'Mazzatron',
      desc:    'Gain/Inversion and Offset Control Utility Module',
      'PRICE': '110',
      'HP':    '8'
    },
    {
      name:    'SubMix',
      manu:    'Hinton Instruments',
      desc:    '2 x 4 channel mixer',
      'PRICE': '300',
      'HP':    '14'
    },
    {
      name:    'Random Pulse 4x',
      manu:    'EMW',
      desc:    'Random Pulse Generator',
      'PRICE': '81',
      'HP':    '6'
    },
    {
      name: 'MULTIBAND DISTORTION PROCESSER, C68 EURO PANEL',
      manu: 'Nonlinearcircuits',
      desc: 'MULTIBAND DISTORTION PROCESSER, C68 EURO PANEL',
      'HP': '18'
    },
    {
      name:    'Bleeding Hearts',
      manu:    'Recovery Effects and Devices',
      desc:    'Random Sequencer, Rhythm Generator, Destroyer and Filter',
      'PRICE': '204',
      'HP':    '20 HP '
    },
    {
      name:    'mA',
      manu:    'Mungo Enterprises',
      desc:    'Mixer + Envelope + VCA',
      'PRICE': '370',
      'HP':    '12'
    },
    {
      name:    'Dual Attack Generator Model 180',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Dual Envelope Generator',
      'PRICE': '250',
      'HP':    '14'
    },
    {
      name:    'Phuz',
      manu:    'York Modular',
      desc:    '2HP transistor fuzz/distortion',
      'PRICE': '13',
      'HP':    '2'
    },
    {
      name:    'ADSR-D Envelope Generator',
      manu:    'PMFoundations',
      desc:    'All discrete vintage-synth style Envelope Generator',
      'PRICE': '18',
      'HP':    '6'
    },
    {
      name:    '24dB LPF',
      manu:    'MFOS',
      desc:    'Four Pole 24dB/Oct With VC Resonance Low Pass Filter',
      'PRICE': '9',
      'HP':    '10'
    },
    {
      name:    'Entropy Cannon',
      manu:    'VOID Modular',
      desc:    'Entropy Cannon v1 - Crusher, Filter, Distortion',
      'PRICE': '201',
      'HP':    '10'
    },
    {
      name:    'GЛИТЧ-3 black СК',
      manu:    'Paratek',
      desc:    'Analog signal visualisation unit',
      'PRICE': '107',
      'HP':    '6'
    },
    {
      name:    'VCFive',
      manu:    'Pharmasonic',
      desc:    'Roland SH-5 multimode filter clone',
      'PRICE': '195',
      'HP':    '10'
    },
    {
      name:    'NEW ! cloud busting wood',
      manu:    'Error Instruments',
      desc:    'Full experimental modular synthesizer - sound of Ciat Plum and more ',
      'PRICE': '230',
      'HP':    '18'
    },
    {
      name:    'SYS-700 VCF 703F',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s VCF 703F (24dB LP).',
      'PRICE': '205',
      'HP':    '16'
    },
    {
      name:    '3x ATT (green panel)',
      manu:    'ph modular',
      desc:    'Passive attenuator, with selector mode (LIN or LOG)',
      'PRICE': '37',
      'HP':    '4'
    },
    {
      name:    'Sequencer',
      manu:    'Oakley',
      desc:    'Analogue Sequencer',
      'PRICE': '250',
      'HP':    '50'
    },
    {
      name:    'MVCF-I: 12dB/oct VCF',
      manu:    'Majella Audio',
      desc:    'Voltage controlled Filter (12dB/oct)',
      'PRICE': '119',
      'HP':    '6'
    },
    {
      name:    'Tomo Muji V2',
      manu:    'Error Instruments',
      desc:    'Touch interface  CV / Gate Controller',
      'PRICE': '79',
      'HP':    '12'
    },
    {
      name:    'A-535 Gain Up! (Silver)',
      manu:    'Ladik',
      desc:    'Dual Amplifier',
      'PRICE': '50',
      'HP':    '4'
    },
    {
      name:    'Double Dragon',
      manu:    'Beast-Tek',
      desc:    'Dual complex LFO',
      'PRICE': '227',
      'HP':    '10'
    },
    {
      name:    'E-251 Stereo Slider EQ - black',
      manu:    'Ladik',
      desc:    'E-251 Stereo slider EQ module for eurorack / Doepfer A100 system ',
      'PRICE': '85',
      'HP':    '16'
    },
    {
      name:    'CATPAW black',
      manu:    'Catoff',
      desc:    'Multifunctional CV Utilite',
      'PRICE': '33',
      'HP':    '3'
    },
    {
      name: 'Pathogen',
      manu: 'Beast-Tek',
      desc: 'Trigger burst generator and 4 channel pattern generator',
      'HP': '10'
    },
    {
      name:    'ADDAC807A+',
      manu:    'ADDAC System',
      desc:    'ADDAC807A Individual Channel Stereo Outputs Expansion',
      'PRICE': '80',
      'HP':    '6'
    },
    {
      name:    '912 Envelope Follower',
      manu:    'Aion Modular',
      desc:    'Envelope Follower',
      'PRICE': '195',
      'HP':    '6'
    },
    {
      name:    'Eurorack Patchbay',
      manu:    'Mazzatron',
      desc:    'Eurorack Patchbay 1/8-1/4',
      'PRICE': '55',
      'HP':    '8'
    },
    {
      name:    'VCDLFO',
      manu:    'Wavefonix',
      desc:    'Versatile VCDLFO  Random Voltage Generator in One Module',
      'PRICE': '102',
      'HP':    '8 HP'
    },
    {
      name:    '3-Channel Stereo Panning Mixer',
      manu:    'Wavefonix',
      desc:    '3-Channel Stereo Audio Mixer with Panning  Headphone Outputs ',
      'PRICE': '113',
      'HP':    '12'
    },
    {
      name:    'PHRSR',
      manu:    'Super Synthesis',
      desc:    'two channel step knob recorder / sequencer',
      'PRICE': '69',
      'HP':    '6'
    },
    {
      name:    'Numeric Repetitor (Purple)',
      manu:    'Noise Engineering',
      desc:    'Four-channel rhythm generator based on binary arithmetic',
      'PRICE': '213',
      'HP':    '8'
    },
    {
      name:    '24dB Cascade VCF',
      manu:    'Aqa Elektrix',
      desc:    '',
      'PRICE': '329',
      'HP':    '14'
    },
    {
      name:    'DUALKEY',
      manu:    'Flame',
      desc:    'Pingable Envelope Trigger Delay',
      'PRICE': '199',
      'HP':    '10'
    },
    {
      name:    'MiniMod CV Mixer - Offset - VCA (Silver Panel Version)',
      manu:    'AJH Synth',
      desc:    'CV Mixer Offset VCA',
      'PRICE': '170',
      'HP':    '10'
    },
    {
      name:    'Wavetable LFO V2',
      manu:    'EMW',
      desc:    'Wavetable LFO',
      'PRICE': '145',
      'HP':    '8'
    },
    {
      name:    'Grosse Pointe Blank Panel (2hp White)',
      manu:    'North Coast Modular Collective',
      desc:    'Future module placeholders for Eurorack.',
      'PRICE': '2',
      'HP':    '2'
    },
    {
      name:    'Raw Spring Nano WHITE WASH',
      manu:    'Error Instruments',
      desc:    '',
      'PRICE': '39',
      'HP':    '3'
    },
    {
      name: 'Knead Expander',
      manu: 'ST Modular',
      desc: 'Expander module for the Knead Analog Mixer',
      'HP': '2'
    },
    {
      name:    'Toggle',
      manu:    'PMFoundations',
      desc:    'Two independent 2-way switches with voltage controlled and manual switching',
      'PRICE': '13',
      'HP':    '4'
    },
    {
      name:    'Attenuator',
      manu:    'PMFoundations',
      desc:    '',
      'PRICE': '13',
      'HP':    '6'
    },
    {
      name:    'YM3812 V3',
      manu:    'Reckless Experimentation Audio',
      desc:    'YM3812 with all variables patchable',
      'PRICE': '67',
      'HP':    '34'
    },
    {
      name:    'rBPF2',
      manu:    'York Modular',
      desc:    'YoMo 2HP multi-feedback resonant bandpass filter',
      'PRICE': '33',
      'HP':    '2'
    },
    {
      name:    '2prin6 v.3',
      manu:    'Error Instruments',
      desc:    'experimental abstract voice / drum',
      'PRICE': '169',
      'HP':    '10'
    },
    {
      name:    'Timing Pulse Generator MODEL 140',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Transistor Pulse Generator',
      'PRICE': '348',
      'HP':    '14'
    },
    {
      name:    'The Arpopone',
      manu:    'Error Instruments',
      desc:    'Melody / bass line generator',
      'PRICE': '359',
      'HP':    '22'
    },
    {
      name:    'BMC022 Auto-Seq',
      manu:    'Barton Musical Circuits',
      desc:    'Auto-Sequencer',
      'PRICE': '112',
      'HP':    '12'
    },
    {
      name: 'Sauce of Unce (Magpie Modular panel)',
      manu: 'Nonlinearcircuits',
      desc: 'Buchla 265 DIY clone',
      'HP': '10'
    },
    {
      name:    'Dazzle (w 3u Panel)',
      manu:    'Plum Audio',
      desc:    'Dual VC-Polarizer / Stereo Modulator / VCA',
      'PRICE': '130',
      'HP':    '6'
    },
    {
      name:    'ATT3',
      manu:    'JPSynth',
      desc:    'Triple Attenuators',
      'PRICE': '55',
      'HP':    '4'
    },
    {
      name:    'PEARL (Black Face)',
      manu:    'Recovery Effects and Devices',
      desc:    '(Heavy Low-End Eurorack Fuzz)',
      'PRICE': '133',
      'HP':    '8'
    },
    {
      name:    'SYS-700 Mixer 716',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s Mixer 716',
      'PRICE': '152',
      'HP':    '12'
    },
    {
      name:    'SYS-700 Multiple 710',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s 710A  710B Multiple Jack',
      'PRICE': '103',
      'HP':    '12'
    },
    {
      name:    'KEYS-1 Keyboard Quantizer',
      manu:    'Mazzatron',
      desc:    'Keyboard Quantizer',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name:    'COTA',
      manu:    'Oakley',
      desc:    'Multimode filter with soft clipping mode',
      'PRICE': '180',
      'HP':    '10'
    },
    {
      name:    'Clocker',
      manu:    'Shock Electronix',
      desc:    'The Shock Electronix Clocker is a BPM Generator and clock divider. ',
      'PRICE': '125',
      'HP':    '12'
    },
    {
      name:    'XOT',
      manu:    'Catoff',
      desc:    'Mix System Master Channel',
      'PRICE': '81',
      'HP':    '8'
    },
    {
      name:    'The Final Buffer',
      manu:    'DD Modules',
      desc:    'Output Buffer, Vu-Meter, mixer,  DI.',
      'PRICE': '150',
      'HP':    '9'
    },
    {
      name:    '&micro;MCCGT',
      manu:    'Flame',
      desc:    'MIDI CC  gate',
      'PRICE': '189',
      'HP':    '5'
    },
    {
      name:    'BLM Lunar Modulation Lab VCO',
      manu:    'Blue Lantern Modules',
      desc:    'Analog VCO / LFO',
      'PRICE': '290',
      'HP':    '18'
    },
    {
      name:    '8-CH Mixer',
      manu:    'EMW',
      desc:    'Eight-channel stereo mixer',
      'PRICE': '109',
      'HP':    '20'
    },
    {
      name:    'Sharp Cutoff Filter MODEL 191',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Transistor Filter',
      'PRICE': '616',
      'HP':    '28'
    },
    {
      name:    '2HP Dual AB selector',
      manu:    'ph modular',
      desc:    'Dual AB selector 2HP',
      'PRICE': '25',
      'HP':    '2'
    },
    {
      name:    'IM&Aacute;GENES',
      manu:    'Olivella Modular',
      desc:    'Stereo state variable filter',
      'PRICE': '219',
      'HP':    '16 HP '
    },
    {
      name:    'QUATRO',
      manu:    'Olivella Modular',
      desc:    'Quad VCA / VC mixer',
      'PRICE': '125',
      'HP':    '12'
    },
    {
      name:    'Active Mixer',
      manu:    'Mazzatron',
      desc:    '4-Channel Active Mixer',
      'PRICE': '55',
      'HP':    '6'
    },
    {
      name:    'ORX',
      manu:    'Adventure Audio',
      desc:    'OR/NOR gate',
      'PRICE': '64',
      'HP':    '2'
    },
    {
      name:    'Noise Generator (NG)',
      manu:    'Wavefonix',
      desc:    'Noise Generator with Three Different Outputs',
      'PRICE': '72',
      'HP':    '5'
    },
    {
      name:    'Wrangler',
      manu:    'Visible Signals',
      desc:    'High bandwidth voltage processor/mixer with LED meter and second 0-1V clipped output',
      'PRICE': '23',
      'HP':    '4 HP'
    },
    {
      name: 'Mutagen',
      manu: 'Beast-Tek',
      desc: 'Dual Bernoulli Gate plus Logic Gates',
      'HP': '10'
    },
    {
      name:    'm658 / Mother Mutant Module',
      manu:    'Trogotronic',
      desc:    'Model 658 Mother Mutant Analog Audio MiniSynth',
      'PRICE': '400',
      'HP':    '37'
    },
    {
      name:    'Quarks',
      manu:    'CalSynth',
      desc:    'Micro Elements',
      'PRICE': '221',
      'HP':    '22'
    },
    {
      name:    'Dual VU Meter',
      manu:    'Wavefonix',
      desc:    'Dual VU Meter for Monitoring Audio Signals',
      'PRICE': '91',
      'HP':    '6'
    },
    {
      name:    'Babel',
      manu:    'New Systems Instruments',
      desc:    'Analog Logic and Intermodulation',
      'PRICE': '125',
      'HP':    '6'
    },
    {
      name:    'Suprematist',
      manu:    'LA Circuits',
      desc:    'Voltage Controlled LFO',
      'PRICE': '273',
      'HP':    '12'
    },
    {
      name:    'Black HP VCF',
      manu:    'Erica Synths',
      desc:    'Hi-pass VCF with overdrive',
      'PRICE': '150',
      'HP':    '10'
    },
    {
      name:    'RND Modul Logistische Gleichung (Analog)',
      manu:    'Klangbau K&ouml;ln',
      desc:    'Completely analog logistic equation computer.',
      'PRICE': '99',
      'HP':    '6'
    },
    {
      name: 'DIN SYNC',
      manu: 'Malekko Heavy Industry',
      desc: '4HP DIN/SYNC EXPANDER MODULE FOR MALEKKO SYNC',
      'HP': '4'
    },
    {
      name:    'MultiLFO MK2',
      manu:    'VBrazil Systems',
      desc:    '1 Hybrid LFO / Oscillator, 2 Analog LFOs, and 1 Noise Generator',
      'PRICE': '268',
      'HP':    '20'
    },
    {
      name:    'XTr3tone',
      manu:    'Qosmo Modular',
      desc:    '12/18/24 dB Low Pass Filter  VCA',
      'PRICE': '299',
      'HP':    '14'
    },
    {
      name:    'XLow',
      manu:    'Qosmo Modular',
      desc:    'Low Frequency Oscillator',
      'PRICE': '99',
      'HP':    '4'
    },
    {
      name:    'TOUCH SCULL ERROR edition full build B / Z',
      manu:    'Error Instruments',
      desc:    'Double capacitive sensing gate with momentary or latching switch ',
      'PRICE': '79',
      'HP':    '4'
    },
    {
      name:    'DAN',
      manu:    'Barton Musical Circuits',
      desc:    'Noise module',
      'PRICE': '94',
      'HP':    '6'
    },
    {
      name: 'Folder',
      manu: 'Korb-Modular',
      desc: 'pusherman panel',
      'HP': '18'
    },
    {
      name:    'Tropical Noise (white edition)',
      manu:    'Error Instruments',
      desc:    'Experimental oscillator',
      'PRICE': '190',
      'HP':    '11'
    },
    {
      name:    'Bleeding Hearts (Black)',
      manu:    'Recovery Effects and Devices',
      desc:    'Sequenced bit crusher, distortion and filter',
      'PRICE': '212',
      'HP':    '20'
    },
    {
      name:    'Bandpass Filter Model 194',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Transistor Bandpass Filter Inspired by Buchla 194',
      'PRICE': '214',
      'HP':    '14'
    },
    {
      name:    'A/B++',
      manu:    'ph modular',
      desc:    'A/B switch - patchbay - multiple',
      'PRICE': '57',
      'HP':    '7'
    },
    {
      name:    'VCEG',
      manu:    'PMFoundations',
      desc:    'Voltage Controlled Envelope Generator',
      'PRICE': '18',
      'HP':    '6'
    },
    {
      name:    'ДИУ-2от black',
      manu:    'Paratek',
      desc:    'Led stereo VU meter',
      'PRICE': '85',
      'HP':    '4'
    },
    {
      name:    'Multiwaves',
      manu:    'Vinicius Electrik',
      desc:    'Advanced VCO/triple LFO',
      'PRICE': '258',
      'HP':    '22'
    },
    {
      name:    'OSC-2',
      manu:    'Reckless Experimentation Audio',
      desc:    'Oscilloscope Interface Module 3 Channels',
      'PRICE': '69',
      'HP':    '4'
    },
    {
      name:    'Analog Kick',
      manu:    'Recovery Effects and Devices',
      desc:    'Analog Drum Module',
      'PRICE': '67',
      'HP':    '8'
    },
    {
      name:    'M-146 6-ch Mixer',
      manu:    'Ladik',
      desc:    '6 channel mixer',
      'PRICE': '40',
      'HP':    '4'
    },
    {
      name:    'V Shape (silver)',
      manu:    'AJH Synth',
      desc:    'Wave Twist and Distort',
      'PRICE': '289',
      'HP':    '10'
    },
    {
      name:    'FleXi blind panel - SILVER - S (6 - 12HP)',
      manu:    'Konstant Lab',
      desc:    '...Fill each empty space in your modular synth...',
      'PRICE': '12',
      'HP':    '12'
    },
    {
      name:    'XO106-R4.5',
      manu:    'York Modular',
      desc:    'Drone/Noise Generator',
      'PRICE': '20',
      'HP':    '8'
    },
    {
      name:    'MS-1 Expander',
      manu:    'Behringer',
      desc:    'Passive breakout module for the MS-101/1 synthesizer',
      'PRICE': '15',
      'HP':    '8'
    },
    {
      name:    'POKIT',
      manu:    'Grayscale',
      desc:    'Eurorack conversion kit for the Teenage Engineering Pocket Operator Keyboard',
      'PRICE': '88',
      'HP':    '42'
    },
    {
      name:    '3M&Oslash; MEGA PANEL',
      manu:    'M&oslash;ffenzeef M&oslash;dular',
      desc:    'L&oslash;-fi, digital, es&oslash;teric drum m&oslash;dule.',
      'PRICE': '556',
      'HP':    '36'
    },
    {
      name:    'Expander D3',
      manu:    'midiphy',
      desc:    'midiphy triggers expander',
      'PRICE': '75',
      'HP':    '4'
    },
    {
      name:    'F-110 Alternative Black Panel',
      manu:    'Ladik',
      desc:    '5-band fixed filter bank',
      'PRICE': '59',
      'HP':    '4'
    },
    {
      name: 'Guitar Input (Oscillosaurus Panel)',
      manu: 'Barton Musical Circuits',
      desc: 'External Instrument Input/Envelope Follower',
      'HP': '12'
    },
    {
      name:    'VAC-LPG',
      manu:    '256klabs',
      desc:    'dual passive vactrol LPG',
      'PRICE': '46',
      'HP':    '4'
    },
    {
      name: 'psuII',
      manu: 'Seismic Industries',
      desc: '1HP version of the IPS2 guts',
      'HP': '1'
    },
    {
      name:    'Pro1 Heinakroon Afterhours Skin',
      manu:    'Behringer',
      desc:    'Analog Synthesizer with Dual VCOs, 3 Simultaneous Waveforms, 4-Pole VCF, Extensive...',
      'PRICE': '277',
      'HP':    '80'
    },
    {
      name:    'MKC8 Ор black',
      manu:    'Paratek',
      desc:    'mixer',
      'PRICE': '111',
      'HP':    '6'
    },
    {
      name:    '4023 VCF Black',
      manu:    'G-Storm Electro',
      desc:    'ARP Odyssey MK1 Two-Pole Filter Adaptation',
      'PRICE': '130',
      'HP':    '8'
    },
    {
      name:    'Dual Switch (SW)',
      manu:    'Wavefonix',
      desc:    'Dual Passive Switch',
      'PRICE': '39',
      'HP':    '4'
    },
    {
      name:    'Sunless City',
      manu:    'LA Circuits',
      desc:    'EM-402 Sunless City Transistor Ladder Filter',
      'PRICE': '273',
      'HP':    '12'
    },
    {
      name:    'VC LFO',
      manu:    'Thorn Audio',
      desc:    'Voltage Controlled Low Frequency Oscillator',
      'PRICE': '199',
      'HP':    '12'
    },
    {
      name:    'AD110 Analog Drums',
      manu:    'Weston Precision Audio',
      desc:    'All 6 DR110 voices in one 16HP module',
      'PRICE': '278',
      'HP':    '16'
    },
    {
      name:    'ES21 - 10-Step Sequencer',
      manu:    'Elby Designs',
      desc:    '10-Step Sequencer',
      'PRICE': '255',
      'HP':    '14'
    },
    {
      name: 'bong0',
      manu: 'Nonlinearcircuits',
      desc: 'clark panel',
      'HP': '4'
    },
    {
      name: 'XLogic',
      manu: 'Qosmo Modular',
      desc: 'Logic Operator Utility',
      'HP': '8'
    },
    {
      name: 'ASM303 - Envelope Follower',
      manu: 'Elby Designs',
      'HP': '7'
    },
    {
      name:    'Saw',
      manu:    'PMFoundations',
      desc:    'Saw wave shaper - Triangle in and Saw/Ramp out',
      'PRICE': '13',
      'HP':    '4'
    },
    {
      name:    'DIY Grids Module with Midi In',
      manu:    'Blue Lantern Modules',
      desc:    'Alternate layout of &Eacute;milie Gillet\'s Grids by Flavio Mireles ',
      'PRICE': '185',
      'HP':    '16'
    },
    {
      name: 'Snappy',
      manu: 'Circuit Abbey',
      desc: 'Dual Sample  Hold',
      'HP': '2'
    },
    {
      name:    'SISM - Black Panel',
      manu:    '4ms Company',
      desc:    'DIY replacement faceplate for the SISM',
      'PRICE': '32',
      'HP':    '12'
    },
    {
      name:    'CV Arpeggiator + Expander',
      manu:    'Barton Musical Circuits',
      desc:    '',
      'PRICE': '150',
      'HP':    '16'
    },
    {
      name:    'fA',
      manu:    'Mungo Enterprises',
      desc:    'Through Zero Analog Filter and Sine Oscillator',
      'PRICE': '463',
      'HP':    '12'
    },
    {
      name:    'ADSR',
      manu:    'Vinicius Electrik',
      desc:    'ADSR Gen',
      'PRICE': '98',
      'HP':    '8'
    },
    {
      name:    'SYS-100 Mixer',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-101/102 Mixer',
      'PRICE': '101',
      'HP':    '6'
    },
    {
      name:    'VC Master Clock/Divider',
      manu:    'Barton Musical Circuits',
      desc:    'BMC 004 (synthCube Clarke Robinson panel)',
      'PRICE': '129',
      'HP':    '20'
    },
    {
      name: 'BMC54 Stereo Outs',
      manu: 'Barton Musical Circuits',
      desc: '4-Channel Panning Mixer',
      'HP': '12'
    },
    {
      name: '1004T Oscillator',
      manu: 'CMS',
      'HP': '14'
    },
    {
      name: 'BLM Cyllene VCLFO',
      manu: 'Blue Lantern Modules',
      'HP': '12'
    },
    {
      name: 'BLM Barton Duo Q',
      manu: 'Blue Lantern Modules',
      desc: 'Rendered Version of the panel',
      'HP': '4'
    },
    {
      name:    'Shmix',
      manu:    'Manikk',
      desc:    'Six channel DC mono mixer with level shift and backside connectivity',
      'PRICE': '99',
      'HP':    '6'
    },
    {
      name:    'Outbreak',
      manu:    'Manikk',
      desc:    'Eight voice MIDI Interface with 46 output jacks',
      'PRICE': '390',
      'HP':    '14'
    },
    {
      name:    'Transistor Ladder Filter',
      manu:    'OIIIAudio',
      desc:    'This is famous analog filter for modular synthesizers, the scheme was created in the...',
      'PRICE': '222',
      'HP':    '10'
    },
    {
      name:    '2X A/B',
      manu:    'ph modular',
      desc:    'dual passive selector A/B switch',
      'PRICE': '45',
      'HP':    '5 HP'
    },
    {
      name:    'РЗРВ black red buchla knobs',
      manu:    'Paratek',
      desc:    'random gater-interruptor',
      'PRICE': '107',
      'HP':    '4'
    },
    {
      name:    'Euroceiver',
      manu:    'midiphy',
      desc:    'midiphy SRIO and SPI expander',
      'PRICE': '75',
      'HP':    '4'
    },
    {
      name:    'Bad Idea #18214',
      manu:    'M&oslash;ffenzeef M&oslash;dular',
      desc:    'PASSIVE 8 CHANNEL MODULAR TO LINE LEVEL ATTENUATOR',
      'PRICE': '148',
      'HP':    '14'
    },
    {
      name:    'Switcher',
      manu:    'Mutant Modular',
      desc:    'Performance configurable A/B switch / multiple',
      'PRICE': '45',
      'HP':    '4'
    },
    {
      name:    'Bindubba - Magpie white panel',
      manu:    'Nonlinearcircuits',
      desc:    '16 step sequencer',
      'PRICE': '286',
      'HP':    '28'
    },
    {
      name:    '2HP dual Manual Gate',
      manu:    'ph modular',
      desc:    'Gate generator by manual triggering',
      'PRICE': '34',
      'HP':    '2'
    },
    {
      name:    '8-Step',
      manu:    'Orpho',
      desc:    'TRIGGER SEQUENCER',
      'PRICE': '85',
      'HP':    '6'
    },
    {
      name:    'ROTLFO',
      manu:    'Mobula Mobular',
      desc:    'Mobula Mobular\'s Analog LFO',
      'PRICE': '100',
      'HP':    '6'
    },
    {
      name:    'Dual Sample  Hold (SH)',
      manu:    'Wavefonix',
      desc:    'Dual Sample  Hold (SH)',
      'PRICE': '68',
      'HP':    '5'
    },
    {
      name:    'Cockpit&sup2; (blck)',
      manu:    'Endorphin.es',
      desc:    '4 Stereo Channel Performance Mixer',
      'PRICE': '190',
      'HP':    '6'
    },
    {
      name:    'nw2s::o16 (unbalanced)',
      manu:    'nw2s',
      desc:    '',
      'PRICE': '123',
      'HP':    '10'
    },
    {
      name:    'Пуск-3 aluminium',
      manu:    'Paratek',
      desc:    'vactrol based 3 channel muter / gater',
      'PRICE': '74',
      'HP':    '4'
    },
    {
      name:    '3340 Voltage-Controlled Oscillator (VCO) Classic Edition',
      manu:    'Wavefonix',
      desc:    'VCO with CEM3340 Architecture',
      'PRICE': '163',
      'HP':    '13'
    },
    {
      name:    'PMIX',
      manu:    'Eurorack Hardware',
      desc:    'A passive audio and CV mixer from Eurorack Hardware',
      'PRICE': '19',
      'HP':    '2'
    },
    {
      name:    'P-180 Octal switchable &ldquo;OR&rdquo;',
      manu:    'Ladik',
      desc:    'P-180 Octal switchable &ldquo;OR&rdquo; module for Eurorack / Doepfer A100 system',
      'PRICE': '57',
      'HP':    '12'
    },
    {
      name:    'TEO',
      manu:    'Tesseract Modular',
      desc:    '',
      'PRICE': '99',
      'HP':    '4'
    },
    {
      name:    '2xADSR r1-2',
      manu:    'G-Storm Electro',
      desc:    'Dual Envelope Generator',
      'PRICE': '93',
      'HP':    '8'
    },
    {
      name:    'Godfried',
      manu:    'd:Machinery',
      desc:    'Clock Generator + Sequencer',
      'PRICE': '185',
      'HP':    '6'
    },
    {
      name:    'Scandeck',
      manu:    'MMI Modular',
      desc:    '10 Channel Interpolating Scanner',
      'PRICE': '462',
      'HP':    '26 HP'
    },
    {
      name:    'Animator',
      manu:    'Ladik',
      desc:    'Waveform animator',
      'PRICE': '70',
      'HP':    '4'
    },
    {
      name:    'MIDI clock to Pulse',
      manu:    'EMW',
      desc:    'Extracts the MIDI Clock signal and produces 5V pulses with adjustable width.',
      'PRICE': '156',
      'HP':    '12'
    },
    {
      name:    'VXP1',
      manu:    'Synovatron',
      desc:    'Voyager Output Expander',
      'PRICE': '180',
      'HP':    '14'
    },
    {
      name:    'Phones',
      manu:    'L-1',
      desc:    'Dual headphones amplifier.',
      'PRICE': '147',
      'HP':    '8'
    },
    {
      name:    'ES30 Stereo Panner',
      manu:    'Elby Designs',
      desc:    'Dual channel Panner Extension',
      'PRICE': '142',
      'HP':    '12'
    },
    {
      name:    'ASM321 - Basic VCO',
      manu:    'Elby Designs',
      desc:    'Basic ASM VCO',
      'PRICE': '260',
      'HP':    '17'
    },
    {
      name:    'Dual Digital Shift Register DIY version',
      manu:    'Omiindustriies',
      desc:    'DIY version of the Dual Digital Shift Register',
      'PRICE': '25',
      'HP':    '8'
    },
    {
      name:    'Linear Attenuators (Aluminium)',
      manu:    'EMW',
      desc:    '',
      'PRICE': '41',
      'HP':    '6'
    },
    {
      name:    'VCA (Aluminium)',
      manu:    'EMW',
      desc:    '',
      'PRICE': '86',
      'HP':    '10'
    },
    {
      name:    'Multiwave Digital Oscillator (Aluminium)',
      manu:    'EMW',
      desc:    'MIDI controlled oscillator with 40 waveforms in the main osc. section + 8 sub-osc',
      'PRICE': '263',
      'HP':    '18'
    },
    {
      name:    '329 Phase/Flange (Clarke Robinson panel)',
      manu:    'Nonlinearcircuits',
      desc:    '10 stage Phaser/Flanger based on the Aries 329',
      'PRICE': '196',
      'HP':    '12'
    },
    {
      name:    'ASM307 - LAG',
      manu:    'Elby Designs',
      desc:    'Lag processor / slew limiter',
      'PRICE': '85',
      'HP':    '7'
    },
    {
      name:    'Grosse Pointe Blank Panel 8hp (black)',
      manu:    'North Coast Modular Collective',
      desc:    'Future module placeholders for Eurorack.',
      'PRICE': '5',
      'HP':    '8'
    },
    {
      name:    'Buffered Attenuator',
      manu:    'PMFoundations',
      desc:    'Quad active attenuator for Eurorack systems',
      'PRICE': '13',
      'HP':    '6'
    },
    {
      name: 'Brain Custard - Magpie Modular Black Panel',
      manu: 'Nonlinearcircuits',
      desc: 'Audio rate chaotic oscillator - Magpie Modular Black Custard Panel ',
      'HP': '12'
    },
    {
      name:    'VCAR',
      manu:    'Super Synthesis',
      desc:    'Digital AR envelope',
      'PRICE': '88',
      'HP':    '6'
    },
    {
      name: 'TZ-VCO',
      manu: 'Klangbau K&ouml;ln',
      desc: 'Through Zero VCO',
      'HP': '10'
    },
    {
      name:    'Format',
      manu:    'Found Sound',
      desc:    'Format converter utility',
      'PRICE': '79',
      'HP':    '12'
    },
    {
      name:    'Motormatic',
      manu:    'Recovery Effects and Devices',
      desc:    'Bit crushing ring modulator',
      'PRICE': '133',
      'HP':    '14'
    },
    {
      name: 'POW!',
      manu: 'ST Modular',
      desc: 'USB Power Supply Unit',
      'HP': '3'
    },
    {
      name: 'AM8320 SCI Pro One X Digisound 80-6 hybrid filter',
      manu: 'AMSynths',
      desc: 'Newly designed, Skiff-friendly Prophet Filter',
      'HP': '14'
    },
    {
      name:    'Brutalist (v1)',
      manu:    'VOID Modular',
      desc:    'Polivoks-ish VCF with overdrive and resonance boost',
      'PRICE': '76',
      'HP':    '8'
    },
    {
      name:    'Multiple dual channel BR',
      manu:    'ph modular',
      desc:    'Passive multiple dual channels with led indicator',
      'PRICE': '58',
      'HP':    '6'
    },
    {
      name: 'Cause  Effect',
      manu: 'ST Modular',
      desc: 'Voltage Reader, Sample  Hold and Gate Switch',
      'HP': '4'
    },
    {
      name:    'Apr&egrave;s Dix',
      manu:    'LA Circuits',
      desc:    'A quadruple parallel filter module.',
      'PRICE': '329',
      'HP':    '14'
    },
    {
      name:    'B-230 Curious Goat (silver)',
      manu:    'Ladik',
      desc:    '',
      'PRICE': '70',
      'HP':    '8'
    },
    {
      name:    'OCS-2',
      manu:    'Nozo&iuml;d',
      desc:    'analogue style synthesizer',
      'PRICE': '499',
      'HP':    '50'
    },
    {
      name:    'CGS93 (A-H) Trunk',
      manu:    'Elby Designs',
      desc:    'CGS93 (A-H) Trunk',
      'PRICE': '7',
      'HP':    '4'
    },
    {
      name:    'JFET VCO',
      manu:    'Blue Lantern Modules',
      desc:    'Saw Core Precision VCO',
      'PRICE': '121',
      'HP':    '6'
    },
    {
      name:    'Ring Modulator',
      manu:    'Oakley',
      desc:    'Based on the classic ARP 4014 sub-module',
      'PRICE': '150',
      'HP':    '8'
    },
    {
      name:    '8-Bit Cipher - Magpie Modular Black Panel',
      manu:    'Nonlinearcircuits',
      desc:    'Random Gate  Voltage source - Magpie Modular Black Panel',
      'PRICE': '185',
      'HP':    '10'
    },
    {
      name:    'Sonic Lullaby NOIR SKULL',
      manu:    'Error Instruments',
      desc:    '',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name:    'Ian Fritz Euro Teezer thru-zero VCO',
      manu:    'synthCube',
      desc:    'Ian Fritz Euro teezer thru-Zero VCO',
      'PRICE': '219',
      'HP':    '18'
    },
    {
      name:    'State Variable VCF',
      manu:    'Vinicius Electrik',
      desc:    'Dual-input state-variable VCF',
      'PRICE': '196',
      'HP':    '15'
    },
    {
      name:    'Radiate',
      manu:    'Mutant Modular',
      desc:    'Distortion module',
      'PRICE': '190',
      'HP':    '12'
    },
    {
      name: 'Basics Utilty Module (AKA CV PEAKS - Alternate Panel)',
      manu: 'Blue Lantern Modules',
      desc: 'CV version of Peaks',
      'HP': '12'
    },
    {
      name: 'Chordizer',
      manu: 'Barton Musical Circuits',
      desc: 'BMC Chordizer',
      'HP': '14'
    },
    {
      name: 'BLM ADSR v2',
      manu: 'Blue Lantern Modules',
      desc: 'Rendered Version of the panel',
      'HP': '7'
    },
    {
      name:    '3080-VCF',
      manu:    'PMFoundations',
      desc:    'Vintage style 12dB state variable VCF',
      'PRICE': '18',
      'HP':    '6'
    },
    {
      name:    'Yusynth Steiner VCF',
      manu:    'DD Modules',
      desc:    'Steiner-Parker Synthacon Voltage Controlled Filter',
      'PRICE': '180',
      'HP':    '13'
    },
    {
      name:    'SYS-700 Amp./Env. Foll./Integrator 707',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s Amplifier/Envelope Follower/Integrator 707',
      'PRICE': '152',
      'HP':    '14'
    },
    {
      name:    'VOLTAGE RUNNER',
      manu:    'Ginko Synthese',
      desc:    'Non-linear sequencer',
      'PRICE': '260',
      'HP':    '12'
    },
    {
      name:    'Multiple dual channels WR',
      manu:    'ph modular',
      desc:    'Passive multiple dual channels with led indicator',
      'PRICE': '58',
      'HP':    '6'
    },
    {
      name: 'Aerozine 50 4hp blank panel',
      manu: 'North Coast Modular Collective',
      desc: 'Aerozine 50 4hp blank panel',
      'HP': '4'
    },
    {
      name:    'Via ATSR',
      manu:    'Starling',
      desc:    'crossfading envelope',
      'PRICE': '240',
      'HP':    '12'
    },
    {
      name:    'ADSR',
      manu:    'Volt-a-tone',
      desc:    'AS3310 based ADSR',
      'PRICE': '82',
      'HP':    '6'
    },
    {
      name:    'Thunderclap 5hp BLACK PANEL',
      manu:    'Delptronics',
      desc:    'Analog Hand Clap Module',
      'PRICE': '111',
      'HP':    '5'
    },
    {
      name:    'Buffered multiple 1 to 3 (x4 ... and more!) W',
      manu:    'ph modular',
      desc:    'Buffered multiple with two routing mode white panel',
      'PRICE': '65',
      'HP':    '6 HP'
    },
    {
      name:    'R2R DAC',
      manu:    'Wavefonix',
      desc:    'Classic R2R Ladder DAC',
      'PRICE': '39',
      'HP':    '4'
    },
    {
      name:    'Monotropa II',
      manu:    'Reverse Landfill',
      desc:    'Feedback distortion',
      'PRICE': '200',
      'HP':    '14'
    },
    {
      name:    'Chronograph',
      manu:    'LA Circuits',
      desc:    'EM-6A | Sequential Rhythm Generator',
      'PRICE': '1.667',
      'HP':    '84'
    },
    {
      name:    '881',
      manu:    'System80',
      desc:    'Trigger input expander for the 880',
      'PRICE': '153',
      'HP':    '8'
    },
    {
      name:    '5:1',
      manu:    'brownshoesonly',
      desc:    'voltage converter',
      'PRICE': '93',
      'HP':    '6'
    },
    {
      name:    'Heuristic I/O MIDI Expansion',
      manu:    'ADDAC System',
      desc:    'Midi I/O Expander',
      'PRICE': '100',
      'HP':    '6'
    },
    {
      name:    'SH / NOISE NOIR / BLACK NOISE',
      manu:    'Error Instruments',
      desc:    'Multi-noise oscillator',
      'PRICE': '115',
      'HP':    '11'
    },
    {
      name:    'Manual Voltages (BMC050)',
      manu:    'Barton Musical Circuits',
      desc:    'A module that features a button with controllable pitch.',
      'PRICE': '7',
      'HP':    '8'
    },
    {
      name: 'QTLFO',
      manu: 'Barton Musical Circuits',
      desc: 'Quad Trapezoidal LFO',
      'HP': '8'
    },
    {
      name:    'Gate Delay',
      manu:    'EMW',
      desc:    '',
      'PRICE': '77',
      'HP':    '6'
    },
    {
      name:    'Matrix mix',
      manu:    'Hinton Instruments',
      desc:    '8 x 8 matrix mixer',
      'PRICE': '1.175',
      'HP':    '56'
    },
    {
      name:    'DV3',
      manu:    'York Modular',
      desc:    'Dual attack-release envelope generator/slew limiter',
      'PRICE': '40',
      'HP':    '4'
    },
    {
      name:    '4-Channel Mixer',
      manu:    'Vinicius Electrik',
      desc:    '4-channel DC-coupled mixer',
      'PRICE': '142',
      'HP':    '8'
    },
    {
      name:    'Dual Voltage Controlled Gate Model 110',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Dual VCA',
      'PRICE': '223',
      'HP':    '14'
    },
    {
      name:    'M-134 4ch slider mixer (expansion)',
      manu:    'Ladik',
      desc:    'Adds 4 inputs to Ladik M-133 or M-136 slider mixers.',
      'PRICE': '45',
      'HP':    '12'
    },
    {
      name:    'CATCH LFO-B',
      manu:    'ReBach',
      desc:    'CATCH series Low Frequency Oscillator',
      'PRICE': '65',
      'HP':    '6'
    },
    {
      name:    'Noise Toast',
      manu:    'MFOS',
      desc:    'Mfos Noise Toast by Elettrorama',
      'PRICE': '150',
      'HP':    '35'
    },
    {
      name:    'Euphotic Quad VCA and Mixer',
      manu:    'Sognage',
      desc:    'Four-channel VCA and Mixer with Optional Two-Stage Distortion',
      'PRICE': '210',
      'HP':    '12'
    },
    {
      name:    'Listen Four Black Faceplate',
      manu:    '4ms Company',
      desc:    'DIY replacement faceplate for the Listen 4. Black background with white artwork. ',
      'PRICE': '23',
      'HP':    '10'
    },
    {
      name: 'Custom NeinOhNein Kick, Rim and Snare',
      manu: 'Hexinverter &Eacute;lectronique',
      desc: 'A custom frontpanel for the NeinOhNein Kick, Snare and Rim Modules ',
      'HP': '28'
    },
    {
      name:    'MM315 Balanced Modulator',
      manu:    'Metro Modular',
      desc:    'Ring Modulator with patchbay and attenuators',
      'PRICE': '185',
      'HP':    '10'
    },
    {
      name: 'BMC40 - Dual Logic',
      manu: 'Barton Musical Circuits',
      desc: 'Logic',
      'HP': '6'
    },
    {
      name:    'RK003',
      manu:    'Retrokits',
      desc:    'RK003 Passive Mixer',
      'PRICE': '80',
      'HP':    '8'
    },
    {
      name:    'error-modular sonic Lullaby black',
      manu:    'Error Instruments',
      desc:    'music box with in for pre-amp contakt mic or other',
      'PRICE': '142',
      'HP':    '10'
    },
    {
      name:    'Simple LFO - old',
      manu:    'Electronic Things... and Stuff',
      desc:    'Simple Triangle/Square LFO - deprecated (V1.1 and previous)',
      'PRICE': '28',
      'HP':    '4'
    },
    {
      name:    'Koe v4.0',
      manu:    'Atomosynth',
      desc:    'Complete Synthesizer Voice',
      'PRICE': '267',
      'HP':    '42'
    },
    {
      name:    'XTyna',
      manu:    'Qosmo Modular',
      desc:    'Vactrol Double VCA',
      'PRICE': '170',
      'HP':    '6'
    },
    {
      name:    'Gotharman\'s EuroBoard',
      manu:    'Gotharman',
      desc:    'Eurorack Module for Gotharmans Filterboard Designs',
      'PRICE': '230',
      'HP':    '22'
    },
    {
      name: 'Jackie',
      manu: 'trouby modular',
      desc: '3.5mm to 1/4 format converter, amphenol connectors.',
      'HP': '14'
    },
    {
      name: 'Euclidian Pattern Generator',
      manu: 'Klangbau K&ouml;ln',
      desc: '3 Tracks Trigger Sequencer',
      'HP': '12'
    },
    {
      name:    'SOLAR v2 THEREMIN',
      manu:    'Error Instruments',
      desc:    'VCA / LPG super low price / super good',
      'PRICE': '39',
      'HP':    '11'
    },
    {
      name:    'Mycelium Synth with Plaits Firmware',
      manu:    'Blue Lantern Modules',
      desc:    'Custom module loaded with Plaits Firmware by &Eacute;milie Gillet ',
      'PRICE': '219',
      'HP':    '12'
    },
    {
      name:    '&micro;cls',
      manu:    'Tenderfoot Electronics',
      desc:    '4HP expander for Lattice sequencer',
      'PRICE': '106',
      'HP':    '4'
    },
    {
      name:    'SYS-100 Noise',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-101 Noise',
      'PRICE': '101',
      'HP':    '6'
    },
    {
      name:    'ДИУ-3к',
      manu:    'Paratek',
      desc:    'Led VU meter',
      'PRICE': '130',
      'HP':    '4'
    },
    {
      name:    'ТАКТОМЕR-3c relic black',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '152',
      'HP':    '8'
    },
    {
      name:    'ТАКТОМЕR-2c8 aluminium',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '134',
      'HP':    '8'
    },
    {
      name:    'ТАКТОМЕR-2c8 black',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '134',
      'HP':    '8'
    },
    {
      name:    'Bizmuth (Beige LTD)',
      manu:    'Bizmuth Modular',
      desc:    'Bi-directional switch-based controller/signal router',
      'PRICE': '45',
      'HP':    '6'
    },
    {
      name:    'MicroTest',
      manu:    'Michigan Synth Works',
      desc:    '12HP Module Tester',
      'PRICE': '161',
      'HP':    '12'
    },
    {
      name:    '4027 VCO Aluminum',
      manu:    'G-Storm Electro',
      desc:    'Eurorack Adaptation of the ARP 2600 VCO-2',
      'PRICE': '264',
      'HP':    '10'
    },
    {
      name:    'VCA',
      manu:    'New Systems Instruments',
      desc:    'Low Distortion VCA',
      'PRICE': '148',
      'HP':    '6'
    },
    {
      name:    'Envelope Follower-Gate-Trigger',
      manu:    'SynQuaNon',
      desc:    'Envelope Follower with Gate and Trigger Outputs',
      'PRICE': '147',
      'HP':    '5'
    },
    {
      name:    'Distress',
      manu:    'Hexdevices',
      desc:    'Distortion Effect Module',
      'PRICE': '85',
      'HP':    '8'
    },
    {
      name:    'Resonate - Magpie Black Panel',
      manu:    'Nonlinearcircuits',
      desc:    '4 stage VC bandpass filter',
      'PRICE': '185',
      'HP':    '8'
    },
    {
      name:    'Delta VCF Black',
      manu:    'G-Storm Electro',
      desc:    'Korg Delta / Poly-61 Filter Adaptation',
      'PRICE': '130',
      'HP':    '8'
    },
    {
      name:    'AD Multi VCO',
      manu:    'Radical Frequencies',
      desc:    'Handmade analog rich sounding oscillator combined with a waveshaper and a linear AD...',
      'PRICE': '200',
      'HP':    '18'
    },
    {
      name: 'Let\'s Splosh - Seaweed White Magpie Panel',
      manu: 'Nonlinearcircuits',
      desc: 'Audio / CV mixer-mangler',
      'HP': '12'
    },
    {
      name:    'Filter Coupler',
      manu:    'Erica Synths',
      desc:    'A satellite module for the Black HP VCF and the Black LP VCF',
      'PRICE': '90',
      'HP':    '8'
    },
    {
      name:    'SAMPLE  HOLD (Aluminium Panel)',
      manu:    'EMW',
      desc:    'Sample  Hold - Noise generator - LFO module',
      'PRICE': '96',
      'HP':    '10'
    },
    {
      name:    'BMC041 CV Spreader',
      manu:    'Barton Musical Circuits',
      desc:    'Uniform detuning and offsetting of control voltages',
      'PRICE': '64',
      'HP':    '6'
    },
    {
      name:    'MMO-3',
      manu:    'Nozo&iuml;d',
      desc:    'Semi modular synth voice dedicated for drones and other atonal sound',
      'PRICE': '499',
      'HP':    '50'
    },
    {
      name:    '13-Pin Input Breakout',
      manu:    'SynQuaNon',
      desc:    'Roland/BOSS GK Guitar Interface',
      'PRICE': '292',
      'HP':    '16'
    },
    {
      name:    'mfos echo rockit',
      manu:    'synthCube',
      desc:    'mfos echo rockit adapted to euro by synthcube and clarke 68',
      'PRICE': '178',
      'HP':    '26'
    },
    {
      name:    'NOIR, sonic lulaby passive',
      manu:    'Error Instruments',
      desc:    'jeweler in eurorack',
      'PRICE': '99',
      'HP':    '8'
    },
    {
      name:    'Volts',
      manu:    'PMFoundations',
      desc:    'Four manual CV sources',
      'PRICE': '13',
      'HP':    '4'
    },
    {
      name: 'BLM Trippy Dual AR',
      manu: 'Blue Lantern Modules',
      'HP': '6'
    },
    {
      name:    'CATCH VCA-AB',
      manu:    'ReBach',
      desc:    'CATCH series Voltage Controlled Amplifier',
      'PRICE': '65',
      'HP':    '6'
    },
    {
      name:    'XO106r4',
      manu:    'York Modular',
      desc:    'Square Wave Drone/Digital Noise Generator',
      'PRICE': '55',
      'HP':    '6'
    },
    {
      name:    'MVIP Mk 2',
      manu:    'Dave Jones Design',
      desc:    'Updated version of MVIP video effects module',
      'PRICE': '531',
      'HP':    '14'
    },
    {
      name:    'mGrids Midi+',
      manu:    'Michigan Synth Works',
      desc:    'Midi / Clock Expansion for Grids',
      'PRICE': '45',
      'HP':    '2'
    },
    {
      name:    '3-Channel Linear Mixer',
      manu:    'Wavefonix',
      desc:    '3-Channel Linear Mixer',
      'PRICE': '56',
      'HP':    '8'
    },
    {
      name:    '570 Galore',
      manu:    'Timo Rozendal',
      desc:    'Dynamics Processing via Timo Rozendal w/ influence from Thomas Henry\'s circuit ',
      'PRICE': '15',
      'HP':    '6'
    },
    {
      name:    'Hex VCF',
      manu:    'SynQuaNon',
      desc:    '6-Channel VCF with Master Controls for Hexaphonic or Polyphonic Processing',
      'PRICE': '508',
      'HP':    '25'
    },
    {
      name:    '204D VCF',
      manu:    'MachineRoom',
      desc:    'VCF / Passive Mixer',
      'PRICE': '150',
      'HP':    '10'
    },
    {
      name:    'M-613 3ch stereo slider mixer expansion',
      manu:    'Ladik',
      desc:    '3 channel stereo slider mixer expansion',
      'PRICE': '35',
      'HP':    '8'
    },
    {
      name:    '1847 Wavetable Oscillator (VCDO)',
      manu:    'Wavefonix',
      desc:    '8-Bit Wavetable Oscillator (VCDO)',
      'PRICE': '180',
      'HP':    '14'
    },
    {
      name:    'CATCH ADSR-AB',
      manu:    'ReBach',
      desc:    'CATCH Series AS3310 based envelope generator',
      'PRICE': '75',
      'HP':    '8'
    },
    {
      name:    'Super Controller',
      manu:    'Fonitronik',
      desc:    'LFO, Noise, Sample  Hold with Lag',
      'PRICE': '134',
      'HP':    '20'
    },
    {
      name:    'Quad Mixer with Controlled Panorama',
      manu:    'OIIIAudio',
      desc:    'Quad Mixer with Controlled Panorama',
      'PRICE': '312',
      'HP':    '24 HP'
    },
    {
      name:    'HPF-3320',
      manu:    'Takaab',
      desc:    'Voltage Controlled High-pass Filter',
      'PRICE': '75',
      'HP':    '4'
    },
    {
      name:    'Pecking Order',
      manu:    'birdkids',
      desc:    'Pecking Order - A Modular performance controller',
      'PRICE': '699',
      'HP':    '60'
    },
    {
      name:    'Reverse DC motor',
      manu:    'Gieskes',
      desc:    'A reverse DC motor',
      'PRICE': '62',
      'HP':    '6'
    },
    {
      name:    'SYS-700 Analog Switch 723',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s 723 Analog Switch.',
      'PRICE': '152',
      'HP':    '12'
    },
    {
      name:    '101E Red',
      manu:    'G-Storm Electro',
      desc:    'Output Expander for GSE 101-VCO',
      'PRICE': '60',
      'HP':    '4'
    },
    {
      name:    'The Power',
      manu:    'Shock Electronix',
      desc:    'The Shock Electronix The Power is powerful utility module, that can deliver up to...',
      'PRICE': '115',
      'HP':    '6'
    },
    {
      name:    'Triga',
      manu:    '5540lab',
      desc:    'Triple сlock generator',
      'PRICE': '46',
      'HP':    '6'
    },
    {
      name:    'RS-100N',
      manu:    'Analogue Systems',
      desc:    'Low Pass Filter (Dual Bus)',
      'PRICE': '188',
      'HP':    '12'
    },
    {
      name:    'Fuzzbucket Grayscale Version',
      manu:    'synthCube',
      desc:    'Fuzz and Delay',
      'PRICE': '97',
      'HP':    '8'
    },
    {
      name:    'IPS / Interruptible Power Supply',
      manu:    'Seismic Industries',
      desc:    'Interruptible Power Supply',
      'PRICE': '88',
      'HP':    '4'
    },
    {
      name: 'CLM-1',
      manu: 'X-Fade Modular',
      desc: '16-output clock divider',
      'HP': '6'
    },
    {
      name:    'ATG',
      manu:    'SynQuaNon',
      desc:    'AutoTune for Guitar&reg; Hexaphonic Processor',
      'PRICE': '610',
      'HP':    '10'
    },
    {
      name: 'ZTVCO',
      manu: 'Blue Lantern Modules',
      desc: 'Obsolete Personal Stash VCO',
      'HP': '12'
    },
    {
      name:    'U-025 Quad unity buffers',
      manu:    'Ladik',
      desc:    'Four unity buffers for CV/trig-gate or audio',
      'PRICE': '50',
      'HP':    '4'
    },
    {
      name:    'XRandomy',
      manu:    'Qosmo Modular',
      desc:    'Algorithmic Random Note Generator',
      'PRICE': '249',
      'HP':    '14'
    },
    {
      name:    'Resonant Filter Sequencer',
      manu:    'EMW',
      desc:    ' ',
      'PRICE': '173',
      'HP':    '16'
    },
    {
      name:    'GR21 VCF',
      manu:    'ReBach',
      desc:    'GR series 12db/oct 2 pole Low Pass Filter',
      'PRICE': '60',
      'HP':    '8'
    },
    {
      name:    'Sonic Lullaby WHITE WASH',
      manu:    'Error Instruments',
      desc:    '',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name:    'sonic lulabay LOVE Valentine\'s Day',
      manu:    'Error Instruments',
      desc:    'passive music box',
      'PRICE': '69',
      'HP':    '8'
    },
    {
      name: 'Quadsum (audio)',
      manu: 'Aemit',
      desc: 'Quad VC audio mixer (exponential).',
      'HP': '16'
    },
    {
      name:    'Gearbox Basic',
      manu:    'Hinton Instruments',
      desc:    'MIDI Interface',
      'PRICE': '160',
      'HP':    '8'
    },
    {
      name:    'SYS-100 Glide',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-101 Glide/Portamento',
      'PRICE': '103',
      'HP':    '6'
    },
    {
      name:    'СИУ-1ж',
      manu:    'Paratek',
      desc:    'Analog VU-meter',
      'PRICE': '121',
      'HP':    '8'
    },
    {
      name: 'BLM Trippy Dual VCA',
      manu: 'Blue Lantern Modules',
      'HP': '6'
    },
    {
      name:    'P-070 quad switch',
      manu:    'Ladik',
      desc:    'Passive 4-channel switch for CV or audio.',
      'PRICE': '40',
      'HP':    '8'
    },
    {
      name:    'MIX-1 Mixer',
      manu:    'Mazzatron',
      desc:    'Mixer',
      'PRICE': '44',
      'HP':    '6'
    },
    {
      name:    'SWINVAT',
      manu:    'Sfeo',
      desc:    'Swiss Knife Module',
      'PRICE': '75',
      'HP':    '8 HP'
    },
    {
      name:    'Equalizer Line Driver MODEL 175',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Transistor Equalizer',
      'PRICE': '304',
      'HP':    '14'
    },
    {
      name:    'ТАКТОМЕR-3c black',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '152',
      'HP':    '8'
    },
    {
      name:    'ТАКТОМЕR-2c black',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '134',
      'HP':    '6'
    },
    {
      name:    'A/B++ (white panel)',
      manu:    'ph modular',
      desc:    'A/B switch - patchbay - multiple',
      'PRICE': '57',
      'HP':    '7'
    },
    {
      name:    'Transistor Ring Modulator',
      manu:    'OIIIAudio',
      desc:    'Ring modulation is a classical method of coloring a timbre using two different signals.',
      'PRICE': '160',
      'HP':    '4'
    },
    {
      name:    'Dual Integrator Model 155',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Positive and negative slopes Inspired by Buchla 155',
      'PRICE': '321',
      'HP':    '14'
    },
    {
      name:    'Dual Envelope Detector MODEL 130',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Transistor Envelope Follower',
      'PRICE': '321',
      'HP':    '14'
    },
    {
      name: '2LFOSH',
      manu: 'Oscillosaurus',
      desc: 'Barton Musical Circuits BMC017 2LFO SH',
      'HP': '8'
    },
    {
      name:    'BATA',
      manu:    'Jolin Lab',
      desc:    '8-Channel Passive Vactrol LPG/Mixer',
      'PRICE': '190',
      'HP':    '6'
    },
    {
      name:    'FSR-4C/B',
      manu:    'Synthwerks',
      desc:    'FSR-4C/B Force Sensing Resistor Combo Module',
      'PRICE': '147',
      'HP':    '37'
    },
    {
      name:    'Prime Mover',
      manu:    'Noise Lab',
      desc:    'Advanced VCO',
      'PRICE': '360',
      'HP':    '16'
    },
    {
      name:    '1u to 3u Adapter (Pulplogic)',
      manu:    'Abyss Devices',
      desc:    '1u to 3u Adapter (Pulplogic)',
      'PRICE': '14',
      'HP':    '10'
    },
    {
      name: 'Through-Hole Ripples',
      manu: 'Analog Ordnance',
      desc: 'THT version of MI ripples',
      'HP': '10'
    },
    {
      name:    'ДИУ-1к жб',
      manu:    'Paratek',
      desc:    'Led VU meter',
      'PRICE': '74',
      'HP':    '3'
    },
    {
      name:    'Spring Tank Reverb Aluminum',
      manu:    'G-Storm Electro',
      desc:    'Spring Tank Reverb Drive Module',
      'PRICE': '93',
      'HP':    '8'
    },
    {
      name:    '3320 Low-Pass Filter (LPF)',
      manu:    'Wavefonix',
      desc:    'Four-Pole 24dB/Octave LPF with CEM3320 Architecture',
      'PRICE': '113',
      'HP':    '10'
    },
    {
      name:    '3360 Dual Exponential VCA',
      manu:    'Wavefonix',
      desc:    'Dual Exponential Response VCA with AS3360 Architecture',
      'PRICE': '85',
      'HP':    '8'
    },
    {
      name:    '4x4 Passive Multiple (PM)',
      manu:    'Wavefonix',
      desc:    'Passive Multiple with Four Groups',
      'PRICE': '50',
      'HP':    '7'
    },
    {
      name:    '3x3 Passive Multiple (PM)',
      manu:    'Wavefonix',
      desc:    'Passive Multiple with Three Groups',
      'PRICE': '39',
      'HP':    '4'
    },
    {
      name:    'Logarithmic Attenuator (AT)',
      manu:    'Wavefonix',
      desc:    'Logarithmic Attenuator with Three Groups',
      'PRICE': '44',
      'HP':    '5'
    },
    {
      name:    'nw2s::o2-purple',
      manu:    'nw2s',
      desc:    'Discrete Transformer Balanced Dual Output',
      'PRICE': '273',
      'HP':    '6'
    },
    {
      name:    'Tama12',
      manu:    'Hexdevices',
      desc:    '12db Lowpass Filter',
      'PRICE': '90',
      'HP':    '8'
    },
    {
      name:    'A-312 black',
      manu:    'Ladik',
      desc:    'Dual Input Headphones Amp/Mix/Stereo line out (4HP)',
      'PRICE': '58',
      'HP':    '4'
    },
    {
      name:    'GЛИТЧ-3 yellow oled ЖБ',
      manu:    'Paratek',
      desc:    'Analog signal visualisation unit',
      'PRICE': '120',
      'HP':    '6'
    },
    {
      name: 'CLM-1',
      manu: 'X-Fade Modular',
      desc: 'Analog Clock Divider',
      'HP': '6'
    },
    {
      name: 'MFOS 16 step sequencer',
      manu: 'MFOS',
      'HP': '84'
    },
    {
      name:    'error-modular SPIKES WOOD edition',
      manu:    'Error Instruments',
      desc:    '',
      'PRICE': '199',
      'HP':    '20'
    },
    {
      name:    'Eurorack SMPS',
      manu:    'Electronic Things... and Stuff',
      desc:    'Power - The Switched Mode Power Supply',
      'PRICE': '100',
      'HP':    '4'
    },
    {
      name:    'SPIKES white MILK edition.',
      manu:    'Error Instruments',
      desc:    'SPIKES white MILK edition.',
      'PRICE': '240',
      'HP':    '20'
    },
    {
      name: 'brain custard',
      manu: 'Nonlinearcircuits',
      desc: 'panel by clarke robinson',
      'HP': '12'
    },
    {
      name:    'ALBINO . sonic lulaby passive',
      manu:    'Error Instruments',
      desc:    '',
      'PRICE': '99',
      'HP':    '8'
    },
    {
      name:    'sonic lulaby Scull NOIR&gt;&gt;',
      manu:    'Error Instruments',
      desc:    'SCULL NOIR ... lulabay passive',
      'PRICE': '89',
      'HP':    '8'
    },
    {
      name:    'TWO PRINCESS WOOD ! errorinstruments',
      manu:    'Error Instruments',
      desc:    'experimental abstract voice / drum',
      'PRICE': '165',
      'HP':    '10'
    },
    {
      name:    'SOLAR TEREMIN error-moduler',
      manu:    'Error Instruments',
      desc:    'NEW !! solar theremin eurorack',
      'PRICE': '75',
      'HP':    '11'
    },
    {
      name: 'Two Gates',
      manu: 'Aemit',
      desc: 'Dual VCA with VC response.',
      'HP': '16'
    },
    {
      name: 'CSA',
      manu: 'X-Fade Modular',
      desc: 'CV Source  Active Attenuator',
      'HP': '4'
    },
    {
      name: 'QUAD LFO',
      manu: 'oZoe.fr',
      desc: 'QUAD LFO in phase (quadrature) or multiple ratio or free mode.',
      'HP': '14'
    },
    {
      name: 'EMOO',
      manu: 'ST Modular',
      desc: 'Eurorack Adapter Module for MOOER guitar effect pedals',
      'HP': '8'
    },
    {
      name:    'SYS-100 Ring Mod',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-102 Ring Mod',
      'PRICE': '101',
      'HP':    '6'
    },
    {
      name:    'ТАКТОМЕR-2c aluminium',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '134',
      'HP':    '6'
    },
    {
      name:    '7-OR',
      manu:    'PMFoundations',
      desc:    'Gate/Trigger Combiner 7-1 OR Gate',
      'PRICE': '13',
      'HP':    '4'
    },
    {
      name:    'ТАКТОМЕR-2д black',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '134',
      'HP':    '6'
    },
    {
      name:    '13-Pin Output Breakout',
      manu:    'SynQuaNon',
      desc:    'Roland/BOSS Guitar Synth Interface for Hexaphonic or Polyphonic Processing',
      'PRICE': '292',
      'HP':    '16'
    },
    {
      name:    'Random Voltage Source MODEL E',
      manu:    'Tokyo Tape Music Center',
      desc:    'Random Voltage Source',
      'PRICE': '250',
      'HP':    '14'
    },
    {
      name:    'M-145 5-ch Mixer',
      manu:    'Ladik',
      desc:    '5-ch Mixer with inverted output',
      'PRICE': '40',
      'HP':    '4'
    },
    {
      name: 'Lumanoise v4',
      manu: 'Laboratorio Elettronico Popolare',
      desc: 'Eurorack version of the Lumanoise v4 desktop synth',
      'HP': '14'
    },
    {
      name: 'euro.Rakit',
      manu: 'LPZW.modules',
      desc: 'Rakit.co.uk Drum or Metal Synth Eurorack mod',
      'HP': '14'
    },
    {
      name: 'Stereo Outs BMC054',
      manu: 'Barton Musical Circuits',
      desc: 'Stereo Output',
      'HP': '12'
    },
    {
      name:    'NEW ! cloud busting cloudbusting RED LABEL',
      manu:    'Error Instruments',
      desc:    'Cloudbusting is a full experimental Modular synthesiser sound of ciat Plum and more',
      'PRICE': '265',
      'HP':    '18'
    },
    {
      name:    'Passive reversal of signal routing',
      manu:    'ph modular',
      desc:    'Passive reversal of signal routing with attenuator  multiple ',
      'PRICE': '42',
      'HP':    '5 HP'
    },
    {
      name:    'Multiple',
      manu:    'Schenktronics',
      desc:    'Two Bank Switched Multiple',
      'PRICE': '54',
      'HP':    '3'
    },
    {
      name:    '&mu;St',
      manu:    'Olivella Modular',
      desc:    'Minimal panning mixer',
      'PRICE': '85',
      'HP':    '4'
    },
    {
      name:    'Croglin',
      manu:    'Oakley',
      desc:    'Dual Filter',
      'PRICE': '150',
      'HP':    '10'
    },
    {
      name:    'Noise Square (Magpie)',
      manu:    'Bastl Instruments',
      desc:    'noise and square source with Magpie repanel',
      'PRICE': '100',
      'HP':    '5'
    },
    {
      name:    'Dispersion Delay - Magpie white panel',
      manu:    'Nonlinearcircuits',
      desc:    'Vactrol-based bandpass filter delay',
      'PRICE': '241',
      'HP':    '18'
    },
    {
      name:    'VCWF',
      manu:    'York Modular',
      desc:    'Voltage-controlled Lockhart wavefolder (4HP - FR4 panel)',
      'PRICE': '50',
      'HP':    '4'
    },
    {
      name:    '2710 Envelope Follower (EF)',
      manu:    'Wavefonix',
      desc:    'ARP 2600-Inspired Envelope Follower (EF)',
      'PRICE': '138',
      'HP':    '12'
    },
    {
      name:    'Trouser Press',
      manu:    'God\'s Box',
      desc:    'High-quality crossfader and VCA',
      'PRICE': '140',
      'HP':    '6'
    },
    {
      name:    'Veratrum',
      manu:    'Reverse Landfill',
      desc:    'Drone and texture voice',
      'PRICE': '150',
      'HP':    '12'
    },
    {
      name: 'LP-VCF',
      manu: 'Stem Modular',
      desc: 'Low pass voltage controlled filter',
      'HP': '6'
    },
    {
      name:    'D / 8 DIODE FILTER',
      manu:    'Orpho',
      desc:    '12 dB / octave multimode filter',
      'PRICE': '185',
      'HP':    '12'
    },
    {
      name:    'Twiigs (white)',
      manu:    'CalSynth',
      desc:    'Dual Branches',
      'PRICE': '147',
      'HP':    '8'
    },
    {
      name: 'Logo Blank (white)',
      manu: 'Analog Ordnance',
      desc: '10HP Blank Panel',
      'HP': '10'
    },
    {
      name:    'Stooges',
      manu:    'Nonlinearcircuits',
      desc:    'Triple jerk chaos circuits',
      'PRICE': '167',
      'HP':    '8'
    },
    {
      name: 'Three Custom AteOhAte Toms',
      manu: 'Hexinverter &Eacute;lectronique',
      desc: 'A custom made panel for three of Hexinverter\'s AteOhAte Toms',
      'HP': '24'
    },
    {
      name:    'Pedz',
      manu:    'Monde Synthesizer',
      desc:    'Expression pedal interface with VCA',
      'PRICE': '104',
      'HP':    '8'
    },
    {
      name:    'VCO 204 (Aluminium)',
      manu:    'EMW',
      desc:    '',
      'PRICE': '195',
      'HP':    '16'
    },
    {
      name:    'Double Glide',
      manu:    'York Modular',
      desc:    'Dual Portamento / Glide Buffer',
      'PRICE': '27',
      'HP':    '4'
    },
    {
      name:    'VCA-S700',
      manu:    'EMW',
      desc:    'Level-shifting log/lin VCA',
      'PRICE': '88',
      'HP':    '10'
    },
    {
      name:    'Vactrol VCA',
      manu:    'EMW',
      desc:    '',
      'PRICE': '79',
      'HP':    '6'
    },
    {
      name: 'TWO PRINCESS blanka errorinstruments',
      manu: 'Error Instruments',
      desc: 'experimental abstract voice / drum',
      'HP': '10'
    },
    {
      name:    'sonic lulabay LOVE Valentine\'s Day',
      manu:    'Error Instruments',
      desc:    'sonic lulabay LOVE Valentine\'s Day',
      'PRICE': '69',
      'HP':    '8'
    },
    {
      name: 'Quadsum (CV)',
      manu: 'Aemit',
      desc: 'Quad VC CV mixer (linear).',
      'HP': '16'
    },
    {
      name:    'M-178 Mixer Input Expander',
      manu:    'Ladik',
      desc:    '3 x mono, 2 x stereo, 1 x stereo line input expander',
      'PRICE': '77',
      'HP':    '12'
    },
    {
      name:    'HG-16',
      manu:    'Audiospektri',
      desc:    'Harmonic generator/synthesizer/vocoder',
      'PRICE': '740',
      'HP':    '24 HP'
    },
    {
      name:    'CATCH STV',
      manu:    'ReBach',
      desc:    'CATCH series S-trigger converter',
      'PRICE': '34',
      'HP':    '4'
    },
    {
      name:    'Multiple dual channel RG',
      manu:    'ph modular',
      desc:    'Passive multiple dual channels with led indicator',
      'PRICE': '58',
      'HP':    '6'
    },
    {
      name:    'ТАКТОМЕR-3c8',
      manu:    'Paratek',
      desc:    'Gate counter, clock, stopwatch',
      'PRICE': '176',
      'HP':    '12'
    },
    {
      name:    'CATCH Noise',
      manu:    'ReBach',
      desc:    'CATCH series Noise Generator',
      'PRICE': '65',
      'HP':    '6'
    },
    {
      name:    'MPC CV Breakout',
      manu:    'Geeklapeeno',
      desc:    'Breakout module for the CV enabled MPC\'s (Live, Live 2, One)',
      'PRICE': '22',
      'HP':    '4'
    },
    {
      name:    'Noise Generator (NG) Classic Edition',
      manu:    'Wavefonix',
      desc:    'Noise Generator with Three Different Outputs',
      'PRICE': '82',
      'HP':    '5'
    },
    {
      name:    'Ringr',
      manu:    'Tenderfoot Electronics',
      desc:    '2 Channel Passive Ring Modulator',
      'PRICE': '116',
      'HP':    '4'
    },
    {
      name:    'Funky Ladder Filter LE MK2',
      manu:    'omsonic',
      desc:    'This a limited run of my previously very popular Funky Ladder Filer !',
      'PRICE': '62',
      'HP':    '8'
    },
    {
      name:    'video mix',
      manu:    'brownshoesonly',
      desc:    '4 input video rate mixer/attenuator',
      'PRICE': '148',
      'HP':    '8'
    },
    {
      name:    'Camo Blank',
      manu:    'Analog Ordnance',
      desc:    '8HP blank panel',
      'PRICE': '14',
      'HP':    '8'
    },
    {
      name:    'Wave Multipliers  Tube VCA',
      manu:    'Metalbox',
      desc:    'Metalbox constructed version of CGS\'s Wave Multipliers and Tube VCA behind one panel',
      'PRICE': '402',
      'HP':    '31 HP '
    },
    {
      name: '4 Knob Sequencer',
      manu: 'Barton Musical Circuits',
      desc: 'BMC 044 Sequencer Module',
      'HP': '10'
    },
    {
      name: 'FKIT VCF',
      manu: 'Nonlinearcircuits',
      desc: 'ALUMINUM CLARKE ROBINSON PANEL, 8HP',
      'HP': '8'
    },
    {
      name: 'CV Behringer RV600 Reverb. Additional Circuits by Flavio Mireles',
      manu: 'Blue Lantern Modules',
      'HP': '14'
    },
    {
      name: 'BMC49',
      manu: 'Barton Musical Circuits',
      desc: 'Attenuverting Mixer',
      'HP': '8'
    },
    {
      name:    'ER-150-EXTENDER',
      manu:    'ARREL Audio',
      desc:    'High Quality Power Supply',
      'PRICE': '70',
      'HP':    '5'
    },
    {
      name: 'SMT Mindreader',
      manu: 'EAS',
      'HP': '10'
    },
    {
      name:    'Fonitronik TH VC Fader',
      manu:    'Fonitronik',
      desc:    'VC Crossfader',
      'PRICE': '70',
      'HP':    '12'
    },
    {
      name: 'Ampy',
      manu: 'Circuit Abbey',
      desc: 'Dual Linear VCA',
      'HP': '2'
    },
    {
      name: 'CV-DAC-8',
      manu: 'Manikin Electronic',
      desc: '8 Channel Audio/CV USB DAC',
      'HP': '8'
    },
    {
      name:    'M-179 Mixer Input Expander',
      manu:    'Ladik',
      desc:    '1 x stereo in, 4 x stereo line in mixer expander',
      'PRICE': '77',
      'HP':    '12'
    },
    {
      name:    'Dual VCA',
      manu:    'Vinicius Electrik',
      desc:    'Dual DC-coupled VCAs',
      'PRICE': '151',
      'HP':    '4'
    },
    {
      name:    'SYS-100 SH',
      manu:    'Pharmasonic',
      desc:    'System-100 Model-102 SH',
      'PRICE': '101',
      'HP':    '6'
    },
    {
      name:    'Multiple dual channel RY',
      manu:    'ph modular',
      desc:    'Passive multiple dual channels with led indicator',
      'PRICE': '58',
      'HP':    '6'
    },
    {
      name:    'ДИУ-32к',
      manu:    'Paratek',
      desc:    'Led VU meter',
      'PRICE': '107',
      'HP':    '4'
    },
    {
      name: 'BLM Mix Em Up Pro',
      manu: 'Blue Lantern Modules',
      'HP': '12'
    },
    {
      name: 'BLM HPA FX SND',
      manu: 'Blue Lantern Modules',
      desc: 'Rendered Version Panel',
      'HP': '7'
    },
    {
      name:    'Universal Joystick Controller',
      manu:    'OIIIAudio',
      desc:    'X-Y Universal (AC/DC) Joystick Controller Eurorack module with offsets.',
      'PRICE': '178',
      'HP':    '14'
    },
    {
      name:    'Frequency Shifter MODEL 185',
      manu:    'Tokyo Tape Music Center',
      desc:    'Discrete Frequency Shifter',
      'PRICE': '518',
      'HP':    '14'
    },
    {
      name:    'FleXi blind panel - SILVER - L (24 - 48HP)',
      manu:    'Konstant Lab',
      desc:    '...Fill each empty space in your modular synth...',
      'PRICE': '18',
      'HP':    '48'
    },
    {
      name:    'SYS-700 Pulse Shaper 717',
      manu:    'Pharmasonic',
      desc:    'Clone of the System-700\'s Pulse Shaper from the 717 Analog Sequencer.',
      'PRICE': '134',
      'HP':    '6'
    },
    {
      name: 'BMC048 Single Random Rhythm',
      manu: 'Barton Musical Circuits',
      desc: 'Single channel version of BMC047 Random Rhythm module.',
      'HP': '6'
    },
    {
      name:    'VCA-1 Dual VCA',
      manu:    'Mazzatron',
      desc:    'Dual Voltage Controlled Amplifier',
      'PRICE': '115',
      'HP':    '6'
    },
    {
      name:    'Switcher',
      manu:    'Mutant Modular',
      desc:    'Performance A/B switch / multiple',
      'PRICE': '45',
      'HP':    '4'
    },
    {
      name:    'MIDI CoM',
      manu:    'Centrevillage',
      desc:    'MIDI Expander for C Quencer DLX and TriggerHaCker.',
      'PRICE': '54',
      'HP':    '2'
    },
    {
      name:    'VCSK',
      manu:    'York Modular',
      desc:    'LOW-PASS RESONANT SALLEN-KEY VCF',
      'PRICE': '46',
      'HP':    '4'
    },
    {
      name:    'Dual AR / LFO',
      manu:    'DD Modules',
      desc:    'Dual Attack-release module, loopable.',
      'PRICE': '170',
      'HP':    '12'
    },
    {
      name:    'Dalek',
      manu:    'Pharmasonic',
      desc:    'real Ring Mod',
      'PRICE': '93',
      'HP':    '6'
    },
    {
      name:    'SH2-VCF Aluminum',
      manu:    'G-Storm Electro',
      desc:    'Roland SH-2 Filter Adaptation',
      'PRICE': '167',
      'HP':    '8'
    },
    {
      name:    'LightSEQ',
      manu:    'Analog Ordnance',
      desc:    'Light based 8step sequencer',
      'PRICE': '130',
      'HP':    '6'
    },
    {
      name:    '3320 High-Pass Filter (HPF)',
      manu:    'Wavefonix',
      desc:    'Four-Pole 24dB/Octave HPF with CEM3320 Architecture',
      'PRICE': '113',
      'HP':    '10'
    },
    {
      name:    '3-Channel Audio Mixer',
      manu:    'Wavefonix',
      desc:    '3-Channel Audio Mixer',
      'PRICE': '61',
      'HP':    '8'
    },
    {
      name:    'Dual Linear Slew Limiter (SL)',
      manu:    'Wavefonix',
      desc:    'Dual Linear Slew Limiter Suitable for Many Applications',
      'PRICE': '55',
      'HP':    '5'
    },
    {
      name:    'SIGNOS',
      manu:    'Olivella Modular',
      desc:    'Dual signal transmutator',
      'PRICE': '159',
      'HP':    '8'
    },
    {
      name:    '4023',
      manu:    'Pharmasonic',
      desc:    'Faithful clone of the white ARP Odyssey filter.',
      'PRICE': '204',
      'HP':    '10'
    },
    {
      name:    'Gem LP',
      manu:    'God\'s Box',
      desc:    'Small profile four-pole low pass filter',
      'PRICE': '130',
      'HP':    '4'
    },
    {
      name:    'Funky Ladder Filter LE MK2',
      manu:    'omsonic',
      desc:    'This a limited run of my previously very popular Funky Ladder Filer !',
      'PRICE': '62',
      'HP':    '8'
    },
    {
      name:    'USB',
      manu:    'FPB',
      desc:    'USB breakout panel',
      'PRICE': '14',
      'HP':    '2'
    },
    {
      name:    'CS019 Sample + Noise (Revised Panel)',
      manu:    'Circuit Slices',
      desc:    'Classic analog &lsquo;sample  hold&rsquo; and noise circuits in a narrow 4 HP module from Circuit...',
      'PRICE': '56',
      'HP':    '4'
    },
    {
      name:    '2HP DRIVE W',
      manu:    'ph modular',
      desc:    'Drive effect on 2HP',
      'PRICE': '34',
      'HP':    '2'
    },
    {
      name:    '2LFO',
      manu:    'In The Trees',
      desc:    'Double LFO module with triangle and variable wave form outputs',
      'PRICE': '90',
      'HP':    '8'
    },
    {
      name:    'Analog Kick',
      manu:    'Recovery Effects and Devices',
      desc:    'Bass Drum Module',
      'PRICE': '79',
      'HP':    '3 HP'
    },
    {
      name: 'VXP1-OS',
      manu: 'Synovatron',
      desc: 'Voyager Old School Output Expander',
      'HP': '14'
    },
    {
      name:    'rHPF',
      manu:    'York Modular',
      desc:    'Resonant High Pass Filter',
      'PRICE': '30',
      'HP':    '4'
    },
    {
      name:    'VC Signal Switcher',
      manu:    'EMW',
      desc:    '1-in, 4-out patching or sequential switch',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name:    'Synthola 2nd Row',
      manu:    'PMFoundations',
      desc:    'Add-on module to provide a second independent row of CVs for the Synthola Sequencer',
      'PRICE': '18',
      'HP':    '6'
    },
    {
      name: 'MIDI2CV',
      manu: 'oZoe.fr',
      desc: 'Multiple interface tool module between the MIDI standard and a modular synthesizer.',
      'HP': '18'
    },
    {
      name:    'MIDI Port',
      manu:    'Vinicius Electrik',
      desc:    'Monophonic MIDI-CV',
      'PRICE': '169',
      'HP':    '16'
    },
    {
      name:    'CATCH SMP',
      manu:    'ReBach',
      desc:    'CATCH series Signal Multiply modul',
      'PRICE': '28',
      'HP':    '4'
    },
    {
      name:    'ATOF',
      manu:    'Mutant Modular',
      desc:    'trigger clock arduino based',
      'PRICE': '110',
      'HP':    '4'
    },
    {
      name:    'GЛИТЧ-1',
      manu:    'Paratek',
      desc:    'Analog signal visualisation unit',
      'PRICE': '71',
      'HP':    '6'
    },
    {
      name:    'ЛИУ-1д',
      manu:    'Paratek',
      desc:    'Tube VU-meter',
      'PRICE': '134',
      'HP':    '10'
    },
    {
      name: 'BLM Quinarius',
      manu: 'Blue Lantern Modules',
      'HP': '12'
    },
    {
      name: 'BLM Buffer Multiple',
      manu: 'Blue Lantern Modules',
      desc: 'Render Panel',
      'HP': '8'
    },
    {
      name: 'BMC041 CV Spreader (Clarke Robinson Panel)',
      manu: 'Barton Musical Circuits',
      'HP': '6'
    },
    {
      name: 'FM Sinus Problem',
      manu: 'Blue Lantern Modules',
      desc: 'Analog Wave Folder (Concept Rendering)',
      'HP': '12'
    },
    {
      name:    'MIDIAlf Sequencer Front Panel',
      manu:    'Shock Electronix',
      desc:    'The Shock Electronix MIDIAlf Panel, was designed to Eurorack-ify the MIDIAlf by...',
      'PRICE': '30',
      'HP':    '54'
    },
    {
      name:    'ADSR 102',
      manu:    'EMW',
      desc:    'Slimmer version of the original ADSR with switchable response',
      'PRICE': '84',
      'HP':    '8'
    },
    {
      name:    'Stereo Attenuators',
      manu:    'EMW',
      desc:    'Dual stereo attenuators',
      'PRICE': '42',
      'HP':    '6'
    },
    {
      name:    'BMC21 Dual Full Wave Rectifier',
      manu:    'synthCube',
      desc:    'All analog module used to alter timbre and create new harmonic content',
      'PRICE': '112',
      'HP':    '6'
    },
    {
      name:    '24dB LPF',
      manu:    'Volt-a-tone',
      desc:    '24dB low pass filter based on the AS3320 chip',
      'PRICE': '92',
      'HP':    '6'
    },
    {
      name:    'SABRINA AMP + bitsniffer',
      manu:    'Error Instruments',
      desc:    '3HP Dual amplifier That is tuned For the Bitsniffer',
      'PRICE': '59',
      'HP':    '3'
    },
    {
      name:    'VCA',
      manu:    '256klabs',
      desc:    'Dual Linear VCA',
      'PRICE': '74',
      'HP':    '6'
    },
    {
      name:    'Beautifier',
      manu:    'Noise Lab',
      desc:    'Dual Mode VCF',
      'PRICE': '205',
      'HP':    '12'
    },
    {
      name:    'Augmentor',
      manu:    'Noise Lab',
      desc:    'VCA',
      'PRICE': '140',
      'HP':    '8'
    },
    {
      name:    'Voltsatten',
      manu:    'Analog Ordnance',
      desc:    'triple voltage source + attenuator',
      'PRICE': '83',
      'HP':    '6'
    },
    {
      name:    'Attenuverter (AV)',
      manu:    'Wavefonix',
      desc:    'Precision Attenuverter',
      'PRICE': '61',
      'HP':    '5'
    },
    {
      name:    '3360 Linear VCA',
      manu:    'Wavefonix',
      desc:    'Linear Response VCA with AS3360 Architecture',
      'PRICE': '72',
      'HP':    '8'
    },
    {
      name:    'VC XFader',
      manu:    'Arcus Audio',
      desc:    'Triple Voltage Controlled Crossfader',
      'PRICE': '231',
      'HP':    '14'
    },
    {
      name:    '4x4 Buffered Multiple (BM) Classic Edition',
      manu:    'Wavefonix',
      desc:    'Buffered Multiple Featuring Four Groups',
      'PRICE': '93',
      'HP':    '7'
    },
    {
      name:    '2X A/B Alternative version',
      manu:    'ph modular',
      desc:    'dual passive selector A/B switch',
      'PRICE': '45',
      'HP':    '5 HP'
    },
    {
      name:    'White Noise Generator Model 160',
      manu:    'Tokyo Tape Music Center',
      desc:    'White Noise Generator',
      'PRICE': '231',
      'HP':    '14'
    },
    {
      name:    'scanner',
      manu:    'brownshoesonly',
      desc:    '4 input video rate interpolating scanner',
      'PRICE': '185',
      'HP':    '4'
    },
    {
      name:    'BMC032 Blended Bandpass - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc032 blended bandpass, euro',
      'PRICE': '106',
      'HP':    '6'
    },
    {
      name:    'Digital HiHat - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc036 digital hihat',
      'PRICE': '88',
      'HP':    '8'
    },
    {
      name: 'Atten',
      manu: 'Electronic Things... and Stuff',
      desc: '3 Passive Attenuators',
      'HP': '4'
    },
    {
      name:    'CV-8',
      manu:    'Nakedboards',
      desc:    'USB-to-CV interface',
      'PRICE': '102',
      'HP':    '6'
    },
    {
      name: 'ENVELOPE',
      manu: 'ST Modular',
      desc: 'CV ENVELOPE GENERATOR',
      'HP': '12'
    },
    {
      name:    'MM3203A Test Eagle Option 10',
      manu:    'Metro Modular',
      desc:    'Laboratory-grade binding post to eurorack converter',
      'PRICE': '162',
      'HP':    '10'
    },
    {
      name: 'Trimmer I/O',
      manu: 'Hinton Instruments',
      desc: '8 channel DAW input/output Trimmer combo',
      'HP': '24'
    },
    {
      name:    'error-modular sonic Lullaby goldie',
      manu:    'Error Instruments',
      desc:    'music box with in for pre-amp contakt mic or other',
      'PRICE': '142',
      'HP':    '10'
    },
    {
      name: 'DOOF',
      manu: 'Nonlinearcircuits',
      desc: 'ALUMINUM EURO PANEL BY CLARKE ROBINSON',
      'HP': '8'
    },
    {
      name: 'Rim Shot',
      manu: 'Hexinverter &Eacute;lectronique',
      desc: '909 rim shot',
      'HP': '6'
    },
    {
      name:    'Boost',
      manu:    'York Modular',
      desc:    'Dual Gain Channel Module',
      'PRICE': '25',
      'HP':    '4'
    },
    {
      name:    'OptoThing v2.0',
      manu:    'York Modular',
      desc:    'Passive Filter / LPG / VCA',
      'PRICE': '27',
      'HP':    '4'
    },
    {
      name:    'DUAL LFO Devil',
      manu:    'ACXSynth',
      desc:    'Dual LFO',
      'PRICE': '189',
      'HP':    '10'
    },
    {
      name: 'ADSR2',
      manu: 'X-Fade Modular',
      desc: 'Dual ADSR Envelope Generator',
      'HP': '8'
    },
    {
      name:    'DUOCORN NOIR',
      manu:    'Error Instruments',
      desc:    'Double capacitive sensing gate',
      'PRICE': '79',
      'HP':    '4'
    },
    {
      name: 'Delayed Modulation',
      manu: 'MFOS',
      desc: 'MFOS DELAYED MODULATION PCB WITH DIY PANEL',
      'HP': '10'
    },
    {
      name: 'rBPF2',
      manu: 'York Modular',
      desc: 'Bandpass filter',
      'HP': '2'
    },
    {
      name:    'SAMBA Legacy',
      manu:    'Sismo',
      desc:    'Tap Sequencer, drum synth with bass and percussions rhythms combinations',
      'PRICE': '171',
      'HP':    '8'
    },
    {
      name:    'rHPF',
      manu:    'York Modular',
      desc:    'resonant high-pass filter',
      'PRICE': '30',
      'HP':    '3'
    },
    {
      name:    'Two Choices',
      manu:    'ph modular',
      desc:    'Two-channel passive router',
      'PRICE': '50',
      'HP':    '6'
    },
    {
      name:    'Geyser',
      manu:    'DD Modules',
      desc:    'Dual buffered voltage source',
      'PRICE': '60',
      'HP':    '4'
    },
    {
      name:    'formingle',
      manu:    '256klabs',
      desc:    '4 channel DC coupled mono summing mixer with bipolar output.',
      'PRICE': '74',
      'HP':    '6'
    },
    {
      name: 'SVF-1 - Prototype',
      manu: 'Tenderfoot Electronics',
      desc: 'State Variable Filter',
      'HP': '8'
    },
    {
      name:    '3320-VCF',
      manu:    'PMFoundations',
      desc:    'VCF based on classic CEM 3320',
      'PRICE': '19',
      'HP':    '6'
    },
    {
      name:    '2144 Low-Pass Filter (LPF)',
      manu:    'Wavefonix',
      desc:    'Four-Pole 24dB/Octave LPF with SSI2144 Architecture',
      'PRICE': '113',
      'HP':    '10'
    },
    {
      name:    'MIDI THRU',
      manu:    'Tokyo Tape Music Center',
      desc:    '3.5mm MIDI THRU A type and B type switch.',
      'PRICE': '120',
      'HP':    '4'
    },
    {
      name:    'AVR VCO rev2',
      manu:    'York Modular',
      desc:    'Microcontroller-based VCO/VCLFO',
      'PRICE': '59',
      'HP':    '4'
    },
    {
      name:    'Tracky Dacks - Magpie white panel',
      manu:    'Nonlinearcircuits',
      desc:    'Wobbly EG  burst generator',
      'PRICE': '139',
      'HP':    '8'
    },
    {
      name:    'BMC043 4x Decay - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc043 4Xdecay',
      'PRICE': '64',
      'HP':    '10'
    },
    {
      name:    'RS-376',
      manu:    'Analogue Systems',
      desc:    'PHG Expander',
      'PRICE': '99',
      'HP':    '6'
    },
    {
      name: 'Trimmer',
      manu: 'Hinton Instruments',
      desc: 'Variation on Trimmer',
      'HP': '30'
    },
    {
      name:    'Twin-T (revision 2)',
      manu:    'York Modular',
      desc:    'Kick-Drum / Sine Oscillator',
      'PRICE': '27',
      'HP':    '4'
    },
    {
      name:    '10V Level Converter',
      manu:    'EMW',
      desc:    '8-channel voltage converter',
      'PRICE': '71',
      'HP':    '8'
    },
    {
      name: 'SCHLEU&szlig;IG CV Expander',
      manu: 'LPZW.modules',
      desc: '8 channel velocity output for the MIDI/GATE converter',
      'HP': '2'
    },
    {
      name:    'Opto v3',
      manu:    'York Modular',
      desc:    '',
      'PRICE': '31',
      'HP':    '4'
    },
    {
      name:    'Drum Mixer Lite (Oyster White)',
      manu:    'Erica Synths',
      desc:    'Limited Special Edition for SchneidersLaden',
      'PRICE': '170',
      'HP':    '10'
    },
    {
      name: 'BLM VP 7200',
      manu: 'Blue Lantern Modules',
      'HP': '6'
    },
    {
      name:    'Keyboard gates',
      manu:    'Ladik',
      desc:    'gate extension module for K-010 Utility CV Keyboard',
      'PRICE': '66',
      'HP':    '8'
    },
    {
      name:    'ASR-LFO',
      manu:    'EMW',
      desc:    'Three-stage EG plus two-stage looping EG',
      'PRICE': '71',
      'HP':    '6'
    },
    {
      name:    'Dual Amplifier',
      manu:    'EMW',
      desc:    'Dual amplifier with up to x10 gain.',
      'PRICE': '54',
      'HP':    '6'
    },
    {
      name:    'Atten.',
      manu:    'Schenktronics',
      desc:    'Passive Attenuator',
      'PRICE': '54',
      'HP':    '3'
    },
    {
      name: 'RENEPOW',
      manu: 'ST Modular',
      desc: 'Power Module for the STM Renegade 0HP Series',
      'HP': '2'
    },
    {
      name:    'synthCube BMC038 Dual Panel Keyboard',
      manu:    'Barton Musical Circuits',
      desc:    'Two horizontal BMC038 keyboards',
      'PRICE': '181',
      'HP':    '26'
    },
    {
      name:    'Contourist',
      manu:    'Noise Lab',
      desc:    'Envelope Generator',
      'PRICE': '165',
      'HP':    '8'
    },
    {
      name:    'euEM2-B',
      manu:    'Northern Light Modular',
      desc:    'Extended rackmount version of the Evenmidi controller with 10 attenuverted CV inputs -...',
      'PRICE': '350',
      'HP':    '18'
    },
    {
      name:    'A/B Mixer',
      manu:    'In The Trees',
      desc:    '6 channel mixer with two switchable outputs',
      'PRICE': '80',
      'HP':    '8'
    },
    {
      name:    'PV44 IMI',
      manu:    'XODES',
      desc:    'Individual Modulation Inputs expansion for PV44',
      'PRICE': '30',
      'HP':    '3'
    },
    {
      name: 'Thomas Henry PAL VCF',
      manu: 'Fonitronik',
      desc: '3320 based VCF with Phase Shifter, All Pass Filter and Low Pass Filter capabilities,...',
      'HP': '10'
    },
    {
      name:    '6equencer-3U',
      manu:    'Tubbutec',
      desc:    'A 606 inspired drum sequencer and midi interface',
      'PRICE': '250',
      'HP':    '6'
    },
    {
      name:    'BMC004 Clock/Divider - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc004 clock/divider',
      'PRICE': '92',
      'HP':    '8'
    },
    {
      name:    '2xATT ST',
      manu:    'ph modular',
      desc:    'Dual passive attenuator for STEREO signals',
      'PRICE': '35',
      'HP':    '4'
    },
    {
      name:    'Link Patchbay 4X 3U',
      manu:    'Tubbutec',
      desc:    '',
      'PRICE': '70',
      'HP':    '2'
    },
    {
      name:    'Slider',
      manu:    'Kilpatrick Audio',
      desc:    'Four Sliders with Eight Button Controller',
      'PRICE': '141',
      'HP':    '16'
    },
    {
      name:    'Recti Combi (white)',
      manu:    'Analog Ordnance',
      desc:    'Dual channel, 5 input passive bipolar rectifier / combiner',
      'PRICE': '81',
      'HP':    '6'
    },
    {
      name:    'ASM308EXT',
      manu:    'Elby Designs',
      desc:    'Mixer Extension',
      'PRICE': '74',
      'HP':    '6'
    },
    {
      name: 'NUMBERWANG',
      manu: 'Nonlinearcircuits',
      desc: 'ALUMINUM EURO PANEL BY CLARKE ROBINSON',
      'HP': '14'
    },
    {
      name:    'Bus',
      manu:    'Super Synthesis',
      desc:    'CV/Gate Bus Implementing Module',
      'PRICE': '133',
      'HP':    '6'
    },
    {
      name:    'ADSR',
      manu:    'York Modular',
      desc:    'ADSR',
      'PRICE': '30',
      'HP':    '6'
    },
    {
      name: 'SW-1',
      manu: 'X-Fade Modular',
      desc: 'Dual VC  Manual Switch',
      'HP': '6'
    },
    {
      name: 'DHA-1',
      manu: 'Manikin Electronic',
      desc: 'Dual Headphone Amplifier',
      'HP': '12'
    },
    {
      name:    'ДИУ-2сб',
      manu:    'Paratek',
      desc:    'Led stereo VU meter',
      'PRICE': '85',
      'HP':    '4'
    },
    {
      name:    'РЗРВ aluminium trasparent knobs',
      manu:    'Paratek',
      desc:    'random gater-interruptor',
      'PRICE': '107',
      'HP':    '4'
    },
    {
      name:    'ASR 77',
      manu:    'EMW',
      desc:    'Three-stage EG',
      'PRICE': '61',
      'HP':    '6'
    },
    {
      name:    'TR-Core VCF',
      manu:    'EMW',
      desc:    '',
      'PRICE': '113',
      'HP':    '10'
    },
    {
      name: 'Gamma Ray VCO',
      manu: 'Faselunare',
      desc: 'Analog VCO based on the works of Ray Wilson',
      'HP': '8'
    },
    {
      name:    '3to1 Precision Adder Unity',
      manu:    'Electronic Things... and Stuff',
      desc:    '2-channel 3-input Unity Gain Mixer',
      'PRICE': '7',
      'HP':    '4'
    },
    {
      name:    '12dB BPF',
      manu:    'Volt-a-tone',
      desc:    '12dB band pass filter based on the AS3320 chip',
      'PRICE': '92',
      'HP':    '6'
    },
    {
      name: 'Transmuter',
      manu: 'Beast-Tek',
      desc: 'Drum Machine and Groove Box Interface',
      'HP': '10'
    },
    {
      name:    'Threshold',
      manu:    'Pharmasonic',
      desc:    'Triple conditional switch',
      'PRICE': '213',
      'HP':    '16'
    },
    {
      name:    'BMC039 Step Rhythm - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc039 step rhythm sequencer',
      'PRICE': '221',
      'HP':    '14'
    },
    {
      name:    'Smasher',
      manu:    'Kilpatrick Audio',
      desc:    'Sixteen Button Controller',
      'PRICE': '150',
      'HP':    '14'
    },
    {
      name:    'Hubbie',
      manu:    'Kilpatrick Audio',
      desc:    'Four Port USB 2.0 High-speed Hub',
      'PRICE': '83',
      'HP':    '8'
    },
    {
      name:    'РИТМИКС black',
      manu:    'Paratek',
      desc:    '8 channels mixer unit',
      'PRICE': '179',
      'HP':    '12 HP'
    },
    {
      name:    'Passive Mult',
      manu:    'Analog Ordnance',
      desc:    '4+4+6 Passive Multiple',
      'PRICE': '42',
      'HP':    '6'
    },
    {
      name: 'Sum  CV Reference',
      manu: 'Hinton Instruments',
      desc: 'SwitchMix Expander',
      'HP': '6'
    },
    {
      name:    'VCF SH-5X',
      manu:    'EMW',
      desc:    'EMW\'s version of the Roland SH-5 VCF',
      'PRICE': '159',
      'HP':    '10'
    },
    {
      name:    'Ribbonz',
      manu:    'Monde Synthesizer',
      desc:    'Ribbon Controller with after touch and LFO',
      'PRICE': '294',
      'HP':    '10'
    },
    {
      name: 'SW-2',
      manu: 'X-Fade Modular',
      desc: 'Quad Manual Switch',
      'HP': '6'
    },
    {
      name: 'Util 1',
      manu: 'Aemit',
      desc: 'Utility module 1 (1.5 U module)',
      'HP': '44'
    },
    {
      name: 'BLM LYSITHEA LPF',
      manu: 'Blue Lantern Modules',
      'HP': '12'
    },
    {
      name:    'ДИУ-1 кзб',
      manu:    'Paratek',
      desc:    'Led VU meter',
      'PRICE': '63',
      'HP':    '3'
    },
    {
      name:    'Rengeteg M',
      manu:    'Gibbon Digital',
      desc:    'MIDI multiples',
      'PRICE': '49',
      'HP':    '4'
    },
    {
      name:    'Digital8 Expander',
      manu:    'Manikk',
      desc:    'Expander to some of the manikk modules',
      'PRICE': '79',
      'HP':    '2'
    },
    {
      name: 'sequencemix expander',
      manu: 'Hinton Instruments',
      desc: 'clock and pitch reference expansion for sequencemix',
      'HP': '6'
    },
    {
      name: 'Pulse_Divider',
      manu: 'CGS',
      desc: 'Clock Pulse Division',
      'HP': '6'
    },
    {
      name:    'Simple VCO',
      manu:    'Electronic Things... and Stuff',
      desc:    'DIY friendly 4HP Simple VCO',
      'PRICE': '7',
      'HP':    '4'
    },
    {
      name:    'ДИУ-2кб Aluminium',
      manu:    'Paratek',
      desc:    'LED Stereo VU meter',
      'PRICE': '88',
      'HP':    '4'
    },
    {
      name:    'MKC8 С original',
      manu:    'Paratek',
      desc:    'mixer',
      'PRICE': '111',
      'HP':    '6'
    },
    {
      name:    'VCO-3A',
      manu:    'Pharmasonic',
      desc:    'Oscillator based on the Roland SH-3A\'s VCO.',
      'PRICE': '213',
      'HP':    '16'
    },
    {
      name:    '1970',
      manu:    'Pharmasonic',
      desc:    'Filter based on the Teisco S110F filter.',
      'PRICE': '204',
      'HP':    '10'
    },
    {
      name: 'vactrol PiLL - Magpie white panel',
      manu: 'Nonlinearcircuits',
      desc: 'vactrol PiLL',
      'HP': '4'
    },
    {
      name:    'MG - Mutagen Expander',
      manu:    'Beast-Tek',
      desc:    'Expander module for Mutagen',
      'PRICE': '23',
      'HP':    '2'
    },
    {
      name:    'BMC013 Random Resonator - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc013 random resonator',
      'PRICE': '79',
      'HP':    '8'
    },
    {
      name:    'BMC053 4 Quadrant Multiplier and Panner - synthCube',
      manu:    'synthCube',
      desc:    'bmc053 4 quadrant multiplier and panner',
      'PRICE': '156',
      'HP':    '8'
    },
    {
      name:    'BMC031 Quad Trap LFO - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc031 quad trap lfo',
      'PRICE': '110',
      'HP':    '8'
    },
    {
      name:    'BMC019 Delaying AR Generator - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc019 delaying ar generator',
      'PRICE': '134',
      'HP':    '8'
    },
    {
      name:    'BMC025 FM Drum - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc025 fm drum',
      'PRICE': '73',
      'HP':    '8'
    },
    {
      name:    '3320 Low-Pass Filter (LPF) Classic Edition',
      manu:    'Wavefonix',
      desc:    'Four-Pole 24dB/Octave LPF with CEM3320 Architecture',
      'PRICE': '122',
      'HP':    '10'
    },
    {
      name:    'BUFFJRVS',
      manu:    'Mobula Mobular',
      desc:    'His turn-ons are inversion, attenuation, and his turn-off is muting ',
      'PRICE': '144',
      'HP':    '10'
    },
    {
      name:    'Twister',
      manu:    'Kilpatrick Audio',
      desc:    'Four Knob Controller',
      'PRICE': '83',
      'HP':    '6'
    },
    {
      name:    'Passive LPG v2',
      manu:    'Analog Ordnance',
      desc:    'passive vactrol LPG',
      'PRICE': '60',
      'HP':    '4'
    },
    {
      name:    '~&gt;+/-',
      manu:    'Analog Ordnance',
      desc:    'Dual channel bipolar half wave rectifier',
      'PRICE': '46',
      'HP':    '4'
    },
    {
      name:    'ДИУ-2ст Aluminium',
      manu:    'Paratek',
      desc:    'LED Stereo VU meter',
      'PRICE': '88',
      'HP':    '4'
    },
    {
      name:    '2140 Low-Pass Filter (LPF)',
      manu:    'Wavefonix',
      desc:    'Four-Pole 24dB/Octave LPF with SSI2140 Architecture',
      'PRICE': '121',
      'HP':    '10'
    },
    {
      name:    'Spinner',
      manu:    'Kilpatrick Audio',
      desc:    'Endless Rotary Encoder with Four Presets',
      'PRICE': '117',
      'HP':    '8'
    },
    {
      name:    'Hekate',
      manu:    'Hexdevices',
      desc:    'Stereo DIY Audio or CV Mixer',
      'PRICE': '75',
      'HP':    '16'
    },
    {
      name:    'EQ Joy',
      manu:    'Shock Electronix',
      desc:    '6-Band Equalizer',
      'PRICE': '135',
      'HP':    '13'
    },
    {
      name:    'Gate Step-Up',
      manu:    'Pharmasonic',
      desc:    'Quadruple gate/trig level shifter.',
      'PRICE': '51',
      'HP':    '4'
    },
    {
      name: 'BMC079 Rise Fall Detector',
      manu: 'Barton Musical Circuits',
      'HP': '6'
    },
    {
      name:    'BMC004 5X Clock Divider - synthCube',
      manu:    'synthCube',
      desc:    'barton bmc004 5Xdivider',
      'PRICE': '153',
      'HP':    '8'
    },
    {
      name:    '8-Step Sequencer Classic Edition',
      manu:    'Wavefonix',
      desc:    '8-Step Pitch  Gate Sequencer',
      'PRICE': '213',
      'HP':    '16'
    },
    {
      name:    'AVS-XFADE-1',
      manu:    'AvonSynth',
      desc:    'VC Crossfader and Panner',
      'PRICE': '90',
      'HP':    '6'
    }
  ];
  
}
