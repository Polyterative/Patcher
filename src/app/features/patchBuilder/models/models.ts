export interface EuroModule {
    name: string;
    description?: string;
    mkr: Manufacturer;
    hp: number;
    ins?: CV[];
    outs?: CV[];
    switches?: Switch[];
}

export interface Manufacturer {
    name: string;
}

export interface Switch {
    name: string;
    positions: string[];
}

export interface CV {
    name: string;
    description?: string;
    min?: number;
    max?: number;
    isVOCT?: boolean;
}

export interface Connection {
    from: EuroModule;
    fromId: number;
    to: EuroModule;
    toId: number;
}

export interface Patch {
    connections: Connection[];
}

export const modules: EuroModule[] = [
    {
        name:     'Waver',
        hp:       12,
        mkr:      {name: 'Bastl x Casper'},
        switches: [
            {
                name:      '!',
                positions: [
                    'ON',
                    'OFF'
                ]
            },
            {
                name:      'B PASS',
                positions: [
                    'ON',
                    'OFF'
                ]
            }
        ],
        outs:     [
            {
                name: 'Shape'
            },
            {
                name: 'Mix'
            }
        ],
        ins:      [
            {
                name: 'A IN'
            },
            {
                name: 'B IN'
            },
            {
                name: 'C IN'
            },
            {
                name: 'Break CV'
            },
            {
                name: 'A CV'
            },
            {
                name: 'Shape CV'
            },
            {
                name: 'C CV'
            }
        ]
    },
    {
        name:     'Basimilus Iteritas Alter',
        hp:       12,
        mkr:      {name: 'Noise Engineering'},
        switches: [
            {
                name:      'Algo',
                positions: [
                    'skin',
                    'liquid',
                    'metal'
                ]
            },
            {
                name:      'Tone',
                positions: [
                    'basso',
                    'alto',
                    'treble'
                ]
            }
        ],
        outs:     [
            {
                name: 'Output'
            }
        ],
        ins:      [
            {
                name:   'Pitch',
                isVOCT: true
            },
            {
                name: 'Spread'
            },
            {
                name: 'Attack'
            },
            {
                name: 'S/L/M'
            },
            {
                name: 'B/A/T'
            },
            {
                name: 'Morph'
            },
            {
                name: 'Decay'
            },
            {
                name: 'Trig'
            }
        ]
    },
    {
        name: 'Belgrad',
        hp:   14,
        mkr:  {name: 'XAOC'},
        
        outs: [
            {
                name: 'Output'
            }
        ],
        ins:  [
            {
                name: 'Resonance'
            },
            {
                name: 'FM'
            },
            {
                name: 'Input'
            },
            {
                name: 'V-oct'
            },
            {
                name: 'Balance'
            },
            {
                name: 'Span'
            }
        ]
    },
    {
        name: 'Voltage Block',
        hp:   20,
        mkr:  {name: 'Malekko Heavy Industry'},
        
        outs: [
            {
                name: '1'
            },
            {
                name: '2'
            },
            {
                name: '3'
            },
            {
                name: '4'
            },
            {
                name: '5'
            },
            {
                name: '6'
            },
            {
                name: '7'
            },
            {
                name: '8'
            }
        ],
        ins:  [
            {
                name: 'Clock/CV'
            },
            {
                name: 'Reset/Hold'
            }
        ]
        
    }
];


export const zmodules: EuroModule[] = [
    
    {
        name: 'Plaits',
        mkr:  {name: 'Mutable instruments'},
        hp:   12
    },
    {
        name: 'ALM017 - Pamela\'s NEW Workout',
        mkr:  {name: 'ALM Busy Circuits'},
        hp:   8
    },
    {
        name: 'Disting mk4',
        mkr:  {name: 'Expert Sleepers'},
        hp:   4
    },
    {
        name: 'Rings',
        mkr:  {name: 'Mutable instruments'},
        hp:   14
    },
    {
        name: 'Morphagene',
        mkr:  {name: 'Make Noise'},
        hp:   20
    },
    {
        name: 'Quad VCA',
        mkr:  {name: 'Intellijel'},
        hp:   12
    },
    {
        name: 'Tallin',
        mkr:  {name: 'Xaoc Devices'},
        hp:   6
    },
    {
        name: 'Frames',
        mkr:  {name: 'Mutable instruments'},
        hp:   18
    },
    {
        name: 'X-Pan',
        mkr:  {name: 'Make Noise'},
        hp:   10
    },
    {
        name: 'VCA (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'µVCF',
        mkr:  {name: 'Intellijel'},
        hp:   6
    },
    {
        name: '921B',
        mkr:  {name: 'Behringer'},
        hp:   8
    },
    {
        name: 'Performance Buffered Mult',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   2
    },
    {
        name: 'Blinds',
        mkr:  {name: 'Mutable instruments'},
        hp:   12
    },
    {
        name: 'ES-9',
        mkr:  {name: 'Expert Sleepers'},
        hp:   16
    },
    {
        name: '',
        mkr:  {name: 'ix (Black Panel)'},
        hp:   89
    },
    {
        name: 'MIX 4',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   14
    },
    {
        name: 'HATS808',
        mkr:  {name: 'Tiptop Audio'},
        hp:   20
    },
    {
        name: 'STMIX',
        mkr:  {name: 'Befaco'},
        hp:   36
    },
    {
        name: 'BD909',
        mkr:  {name: 'Tiptop Audio'},
        hp:   8
    },
    {
        name: 'CP909',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: 'Piston Honda Mk III',
        mkr:  {name: 'Industrial Music Electronics'},
        hp:   4
    },
    {
        name: 'Euclidean Circles v2',
        mkr:  {name: 'vpme.de'},
        hp:   12
    },
    {
        name: 'Mimetic Digitalis (Black)',
        mkr:  {name: 'Noise Engineering'},
        hp:   4
    },
    {
        name: 'A-180-2v',
        mkr:  {name: 'Doepfer'},
        hp:   10
    },
    {
        name: 'RND STEP',
        mkr:  {name: 'DivKid'},
        hp:   2
    },
    {
        name: 'Hexmix',
        mkr:  {name: 'Befaco'},
        hp:   14
    },
    {
        name: 'ALM022 - Squid Salmple',
        mkr:  {name: 'ALM Busy Circuits'},
        hp:   28
    },
    {
        name: 'ALM011 - Akemie\'s Castle',
        mkr:  {name: 'ALM Busy Circuits'},
        hp:   6
    },
    {
        name: 'Steppy',
        mkr:  {name: 'Intellijel'},
        hp:   16
    },
    {
        name: 'Mutant Brain',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   14
    },
    {
        name: 'KNIT',
        mkr:  {name: 'Antumbra'},
        hp:   8
    },
    {
        name: 'ADE-32 Octocontroller',
        mkr:  {name: 'Abstract Data'},
        hp:   16
    },
    {
        name: 'Monsoon',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   14
    },
    {
        name: 'Nin',
        mkr:  {name: 'Xaoc Devices'},
        hp:   18
    },
    {
        name: '3x MIA',
        mkr:  {name: 'Happy Nerding'},
        hp:   3
    },
    {
        name: 'Mimetic Digitalis',
        mkr:  {name: 'Noise Engineering'},
        hp:   10
    },
    {
        name: 'A-106-6',
        mkr:  {name: 'Doepfer'},
        hp:   18
    },
    {
        name: 'Kamieniec',
        mkr:  {name: 'Xaoc Devices'},
        hp:   10
    },
    {
        name: 'Trim',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'A-199v',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'MMF',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Mini Slew',
        mkr:  {name: 'Steady State Fate'},
        hp:   8
    },
    {
        name: 'Switchblade',
        mkr:  {name: 'Acid Rain Technology'},
        hp:   4
    },
    {
        name: 'Listen Four',
        mkr:  {name: '4ms Company'},
        hp:   10
    },
    {
        name: 'Stoicheia',
        mkr:  {name: 'Rebel Technology'},
        hp:   10
    },
    {
        name: 'AT-AT-AT',
        mkr:  {name: 'Thonk'},
        hp:   4
    },
    {
        name: 'Octone',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   10
    },
    {
        name: 'MIDI 3',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   6
    },
    {
        name: 'VCO',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'A-134-1',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'TOMS909',
        mkr:  {name: 'Tiptop Audio'},
        hp:   16
    },
    {
        name: 'Fusion VCO2',
        mkr:  {name: 'Erica Synths'},
        hp:   14
    },
    {
        name: 'Godspeed+',
        mkr:  {name: 'Endorphin.es'},
        hp:   6
    },
    {
        name: 'Pulsar',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   14
    },
    {
        name: 'SYSTEM-500 572',
        mkr:  {name: 'Roland'},
        hp:   16
    },
    {
        name: 'A-132-4',
        mkr:  {name: 'Doepfer'},
        hp:   6
    },
    {
        name: 'vincâ',
        mkr:  {name: 'Instru?'},
        hp:   4
    },
    {
        name: 'Instrument Interface v2',
        mkr:  {name: 'Befaco'},
        hp:   8
    },
    {
        name: 'Mikrophonie (2017 new panel design)',
        mkr:  {name: 'Music Thing Modular'},
        hp:   4
    },
    {
        name: 'Fold 6',
        mkr:  {name: 'Joranalogue Audio Design'},
        hp:   4
    },
    {
        name: 'MMF (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Tš-L v2',
        mkr:  {name: 'Instru?'},
        hp:   6
    },
    {
        name: 'Hyrlo',
        mkr:  {name: 'knob.farm'},
        hp:   4
    },
    {
        name: 'LxD (Black and Gold)',
        mkr:  {name: 'Make Noise'},
        hp:   4
    },
    {
        name: 'MA808',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: 'A-147-2v',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'uBurst',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'A-138c',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'Metropolix',
        mkr:  {name: 'Intellijel'},
        hp:   34
    },
    {
        name: 'Multimode VCA',
        mkr:  {name: 'WMD'},
        hp:   10
    },
    {
        name: 'TM (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'LFO v2',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'A-185-2v',
        mkr:  {name: 'Doepfer'},
        hp:   6
    },
    {
        name: 'Performance Mixer (black)',
        mkr:  {name: 'WMD'},
        hp:   40
    },
    {
        name: 'Jupiter Storm',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   14
    },
    {
        name: 'EG',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'ABC (Aluminum)',
        mkr:  {name: 'Bastl Instruments'},
        hp:   5
    },
    {
        name: '106 Chorus',
        mkr:  {name: 'Feedback'},
        hp:   6
    },
    {
        name: 'Queen of Pentacles',
        mkr:  {name: 'Endorphin.es'},
        hp:   30
    },
    {
        name: 'Brst',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Telharmonic (Black and Gold)',
        mkr:  {name: 'Make Noise'},
        hp:   14
    },
    {
        name: 'Trident',
        mkr:  {name: 'Rossum Electro-Music'},
        hp:   30
    },
    {
        name: 'Sequence Selector',
        mkr:  {name: 'Verbos Electronics'},
        hp:   16
    },
    {
        name: 'TG ONE',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: 'Black Blank',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'ALM023 - mmMidi',
        mkr:  {name: 'ALM Busy Circuits'},
        hp:   4
    },
    {
        name: 'Buff',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Blender',
        mkr:  {name: 'Steady State Fate'},
        hp:   6
    },
    {
        name: 'Expert Sleepers Disting MK4 (alternate panel)',
        mkr:  {name: 'Grayscale'},
        hp:   4
    },
    {
        name: 'Amp & Tone',
        mkr:  {name: 'Verbos Electronics'},
        hp:   10
    },
    {
        name: 'A-152',
        mkr:  {name: 'Doepfer'},
        hp:   16
    },
    {
        name: 'Wave Runner',
        mkr:  {name: 'Frequency Central'},
        hp:   4
    },
    {
        name: 'Euclid (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'USTA',
        mkr:  {name: 'Frap Tools'},
        hp:   36
    },
    {
        name: 'Utopia',
        mkr:  {name: 'Dreadbox'},
        hp:   10
    },
    {
        name: 'Kermit MK III',
        mkr:  {name: 'Industrial Music Electronics'},
        hp:   12
    },
    {
        name: 'Transient Plus',
        mkr:  {name: 'Futureretro'},
        hp:   12
    },
    {
        name: 'Zadar (black panel)',
        mkr:  {name: 'Xaoc Devices'},
        hp:   10
    },
    {
        name: 'A-198',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'CB808',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: 'Triad (Black Panel)',
        mkr:  {name: 'WMD'},
        hp:   4
    },
    {
        name: 'Tirana II',
        mkr:  {name: 'Xaoc Devices'},
        hp:   6
    },
    {
        name: 'Multimode Envelope',
        mkr:  {name: 'WMD'},
        hp:   8
    },
    {
        name: 'A-138aV',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'saïch',
        mkr:  {name: 'Instru?'},
        hp:   12
    },
    {
        name: '3x MIA - black',
        mkr:  {name: 'Happy Nerding'},
        hp:   6
    },
    {
        name: 'MA35 VCF / A',
        mkr:  {name: 'Manhattan Analog'},
        hp:   12
    },
    {
        name: 'Maths v2 (Grayscale black panel)',
        mkr:  {name: 'Grayscale'},
        hp:   null
    },
    {
        name: 'BD',
        mkr:  {name: 'Prok Modular'},
        hp:   4
    },
    {
        name: 'ALM017-EX Pexp-2',
        mkr:  {name: 'ALM Busy Circuits'},
        hp:   2
    },
    {
        name: 'CP3A-O',
        mkr:  {name: 'Behringer'},
        hp:   8
    },
    {
        name: 'Autodyne',
        mkr:  {name: 'Steady State Fate'},
        hp:   4
    },
    {
        name: 'Waver',
        mkr:  {name: 'Bastl Instruments'},
        hp:   8
    },
    {
        name: 'DIY Polivoks VCF II',
        mkr:  {name: 'Erica Synths'},
        hp:   10
    },
    {
        name: 'Lifeforms Outs',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   6
    },
    {
        name: 'Switch 4',
        mkr:  {name: 'Joranalogue Audio Design'},
        hp:   8
    },
    {
        name: 'TIMBER',
        mkr:  {name: 'Bastl Instruments'},
        hp:   7
    },
    {
        name: 'uJove',
        mkr:  {name: 'Plum Audio'},
        hp:   8
    },
    {
        name: 'Malgorithm Mark II',
        mkr:  {name: 'Industrial Music Electronics'},
        hp:   10
    },
    {
        name: 'Hyrlo (inverted)',
        mkr:  {name: 'knob.farm'},
        hp:   4
    },
    {
        name: 'Furthrrrr Generator BLCK_EDITION',
        mkr:  {name: 'Endorphin.es'},
        hp:   30
    },
    {
        name: '6 Channel Stereo Mixer',
        mkr:  {name: 'Sputnik Modular'},
        hp:   20
    },
    {
        name: 'A-172',
        mkr:  {name: 'Doepfer'},
        hp:   4
    },
    {
        name: 'Tool-Box',
        mkr:  {name: 'Steady State Fate'},
        hp:   6
    },
    {
        name: 'Dystopia',
        mkr:  {name: 'Dreadbox'},
        hp:   10
    },
    {
        name: 'Maestro',
        mkr:  {name: 'Acid Rain Technology'},
        hp:   20
    },
    {
        name: 'NOISE',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   3
    },
    {
        name: 'Beehive (Micro Plaits) Black',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   8
    },
    {
        name: 'Mutant BD9',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   13
    },
    {
        name: 'Cursus Iteritas',
        mkr:  {name: 'Noise Engineering'},
        hp:   10
    },
    {
        name: 'T43',
        mkr:  {name: 'vpme.de'},
        hp:   4
    },
    {
        name: 'WAV Recorder',
        mkr:  {name: '4ms Company'},
        hp:   6
    },
    {
        name: 'Z8000',
        mkr:  {name: 'Tiptop Audio'},
        hp:   28
    },
    {
        name: 'A-142-4',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'µO_C micro Ornament & Crime (silver)',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   8
    },
    {
        name: 'Delay (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Ikarie',
        mkr:  {name: 'Bastl Instruments'},
        hp:   8
    },
    {
        name: 'Warna II',
        mkr:  {name: 'Xaoc Devices'},
        hp:   6
    },
    {
        name: 'Echophon (white knobs)',
        mkr:  {name: 'Make Noise'},
        hp:   20
    },
    {
        name: 'Shifting Inverting Signal Mingler',
        mkr:  {name: '4ms Company'},
        hp:   12
    },
    {
        name: 'Sarajewo',
        mkr:  {name: 'Xaoc Devices'},
        hp:   12
    },
    {
        name: 'Monsoon',
        mkr:  {name: 'After Later Audio'},
        hp:   12
    },
    {
        name: 'Freez (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Poly',
        mkr:  {name: 'Polyend'},
        hp:   22
    },
    {
        name: 'PM Channels',
        mkr:  {name: 'WMD'},
        hp:   10
    },
    {
        name: 'Lyra8-FX (different knobs)',
        mkr:  {name: 'SOMA Laboratory'},
        hp:   20
    },
    {
        name: 'ROW POWER 45',
        mkr:  {name: '4ms Company'},
        hp:   8
    },
    {
        name: 'A-108',
        mkr:  {name: 'Doepfer'},
        hp:   16
    },
    {
        name: 'ATOM',
        mkr:  {name: 'Antumbra'},
        hp:   30
    },
    {
        name: 'A-121-3',
        mkr:  {name: 'Doepfer'},
        hp:   6
    },
    {
        name: 'SD909',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: 'ADE-50 3x Lin VCA',
        mkr:  {name: 'Abstract Data'},
        hp:   10
    },
    {
        name: 'Mix6',
        mkr:  {name: 'Bubblesound Instruments'},
        hp:   4
    },
    {
        name: 'Drezno',
        mkr:  {name: 'Xaoc Devices'},
        hp:   20
    },
    {
        name: 'MIDI Thing',
        mkr:  {name: 'Befaco'},
        hp:   6
    },
    {
        name: '4tten',
        mkr:  {name: 'WMD'},
        hp:   8
    },
    {
        name: 'Samara II',
        mkr:  {name: 'Xaoc Devices'},
        hp:   4
    },
    {
        name: 'Mix 3',
        mkr:  {name: 'Joranalogue Audio Design'},
        hp:   8
    },
    {
        name: 'MIX7',
        mkr:  {name: 'Tiptop Audio'},
        hp:   2
    },
    {
        name: 'OSCILLATOR MODULE 1004',
        mkr:  {name: 'Behringer'},
        hp:   4
    },
    {
        name: 'Euro DDL',
        mkr:  {name: 'Eventide'},
        hp:   16
    },
    {
        name: 'Shuttle Control BLCK_EDITION',
        mkr:  {name: 'Endorphin.es'},
        hp:   20
    },
    {
        name: '3x VCA - black',
        mkr:  {name: 'Happy Nerding'},
        hp:   12
    },
    {
        name: 'A-120V',
        mkr:  {name: 'Doepfer'},
        hp:   5
    },
    {
        name: 'Black Stereo Mixer V3',
        mkr:  {name: 'Erica Synths'},
        hp:   4
    },
    {
        name: 'Sewastopol II',
        mkr:  {name: 'Xaoc Devices'},
        hp:   10
    },
    {
        name: 'Z2040',
        mkr:  {name: 'Tiptop Audio'},
        hp:   12
    },
    {
        name: 'Bin Seq',
        mkr:  {name: 'Noise Engineering'},
        hp:   19
    },
    {
        name: 'Lifeforms ADSR',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   36
    },
    {
        name: 'SEM 20',
        mkr:  {name: 'Bubblesound Instruments'},
        hp:   10
    },
    {
        name: 'Quattro Figaro ALU',
        mkr:  {name: 'Bastl Instruments'},
        hp:   14
    },
    {
        name: '1005',
        mkr:  {name: 'Behringer'},
        hp:   10
    },
    {
        name: 'DIY Polivoks VCA II',
        mkr:  {name: 'Erica Synths'},
        hp:   4
    },
    {
        name: 'Cockpit BLCK_EDITION',
        mkr:  {name: 'Endorphin.es'},
        hp:   10
    },
    {
        name: 'Nerdseq - \'More Triggers 16\' Expander Black',
        mkr:  {name: 'XOR Electronics'},
        hp:   8
    },
    {
        name: 'Hrad',
        mkr:  {name: 'Xaoc Devices'},
        hp:   4
    },
    {
        name: 'ADDAC301 Floor Control',
        mkr:  {name: 'ADDAC System'},
        hp:   4
    },
    {
        name: 'Mixology',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   28
    },
    {
        name: 'Swoop',
        mkr:  {name: 'Ieaskul F. Mobenthey'},
        hp:   8
    },
    {
        name: '6MIX',
        mkr:  {name: 'Antumbra'},
        hp:   6
    },
    {
        name: 'Pons Asinorum (Black)',
        mkr:  {name: 'Noise Engineering'},
        hp:   6
    },
    {
        name: 'Grendel Formant Filter, v2',
        mkr:  {name: 'Rare Waves'},
        hp:   12
    },
    {
        name: 'twinCussion',
        mkr:  {name: 'Vermona'},
        hp:   24
    },
    {
        name: 'Black Envelope Generator',
        mkr:  {name: 'Erica Synths'},
        hp:   8
    },
    {
        name: 'A-132-8',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'g0',
        mkr:  {name: 'Mungo Enterprises'},
        hp:   12
    },
    {
        name: 'Logic',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Quad VCA / Mixer',
        mkr:  {name: 'L-1'},
        hp:   14
    },
    {
        name: 'Thomas Henry\'s 555-VCO',
        mkr:  {name: 'Fonitronik'},
        hp:   16
    },
    {
        name: 'Black Modulator',
        mkr:  {name: 'Erica Synths'},
        hp:   10
    },
    {
        name: 'NOISE SQUARE (ALUMINIUM)',
        mkr:  {name: 'Bastl Instruments'},
        hp:   5
    },
    {
        name: 'Memory Palace',
        mkr:  {name: 'LZX Industries'},
        hp:   52
    },
    {
        name: 'Neutron w/ Graydon Audio Faceplate',
        mkr:  {name: 'Behringer'},
        hp:   80
    },
    {
        name: 'RS909',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: '6x MIX',
        mkr:  {name: 'Happy Nerding'},
        hp:   6
    },
    {
        name: 'Wobbler',
        mkr:  {name: 'Tinrs'},
        hp:   12
    },
    {
        name: 'Quantum Rainbow 2 (Black and Gold Edition)',
        mkr:  {name: 'Steady State Fate'},
        hp:   4
    },
    {
        name: 'Ataraxic Translatron (Silver)',
        mkr:  {name: 'Noise Engineering'},
        hp:   4
    },
    {
        name: 'Trim (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Cyclebox II Expander',
        mkr:  {name: 'Intellijel'},
        hp:   4
    },
    {
        name: 'A-138e',
        mkr:  {name: 'Doepfer'},
        hp:   16
    },
    {
        name: 'Demon Core EXPANDER',
        mkr:  {name: 'Supercritical Synthesizers'},
        hp:   8
    },
    {
        name: 'Horologic Solum (Black)',
        mkr:  {name: 'Noise Engineering'},
        hp:   4
    },
    {
        name: 'SM000 Mult2x4',
        mkr:  {name: 'SSSR Labs'},
        hp:   2
    },
    {
        name: 'Mob of Emus',
        mkr:  {name: 'Rossum Electro-Music'},
        hp:   16
    },
    {
        name: 'T-Wrex',
        mkr:  {name: 'Alright Devices'},
        hp:   12
    },
    {
        name: 'A-150-8',
        mkr:  {name: 'Doepfer'},
        hp:   12
    },
    {
        name: '2Multi',
        mkr:  {name: 'Takaab'},
        hp:   3
    },
    {
        name: 'Clk (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Sonic XV Diode Ladder Filter',
        mkr:  {name: 'AJH Synth'},
        hp:   14
    },
    {
        name: 'Lifeforms Distro',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   4
    },
    {
        name: 'Arpitecht (black panel)',
        mkr:  {name: 'WMD'},
        hp:   12
    },
    {
        name: 'SumDif',
        mkr:  {name: 'Shakmat Modular'},
        hp:   2
    },
    {
        name: 'NUTONE',
        mkr:  {name: 'Plankton Electronics'},
        hp:   8
    },
    {
        name: 'BD909 (WHITE)',
        mkr:  {name: 'Tiptop Audio'},
        hp:   8
    },
    {
        name: 'A-113',
        mkr:  {name: 'Doepfer'},
        hp:   26
    },
    {
        name: 'Eurorack Noise Swash',
        mkr:  {name: '4ms Company'},
        hp:   16
    },
    {
        name: 'tona',
        mkr:  {name: 'Instru?'},
        hp:   12
    },
    {
        name: 'ECHOZ (BLACK)',
        mkr:  {name: 'Tiptop Audio'},
        hp:   8
    },
    {
        name: 'EG (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'ALM012 - SID GUTS DELUXE',
        mkr:  {name: 'ALM Busy Circuits'},
        hp:   19
    },
    {
        name: 'DIY Delay',
        mkr:  {name: 'Erica Synths'},
        hp:   14
    },
    {
        name: 'V-Scale Variable Buffer (Dark Edition)',
        mkr:  {name: 'AJH Synth'},
        hp:   4
    },
    {
        name: 'SM800a Wobla',
        mkr:  {name: 'SSSR Labs'},
        hp:   3
    },
    {
        name: 'Popple',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'Serge Triple+ Waveshaper',
        mkr:  {name: 'Random*Source'},
        hp:   18
    },
    {
        name: 'Drum Sequencer with Black Keys',
        mkr:  {name: 'Erica Synths'},
        hp:   42
    },
    {
        name: 'A-111-6',
        mkr:  {name: 'Doepfer'},
        hp:   10
    },
    {
        name: 'Pachinko',
        mkr:  {name: 'After Later Audio'},
        hp:   12
    },
    {
        name: '2LPG v2',
        mkr:  {name: 'Takaab'},
        hp:   2
    },
    {
        name: 'ADDAC703 Discrete Mixer',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'BitBox 2.0 Black Panel',
        mkr:  {name: '1010 Music'},
        hp:   26
    },
    {
        name: 'ER-101 (original flavor)',
        mkr:  {name: 'Orthogonal Devices'},
        hp:   26
    },
    {
        name: 'omnimod',
        mkr:  {name: 'Macro Machines'},
        hp:   14
    },
    {
        name: 'Domino',
        mkr:  {name: 'Eowave'},
        hp:   10
    },
    {
        name: 'A-147-2 SE',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'Quadrantid Swarm',
        mkr:  {name: 'Eowave'},
        hp:   40
    },
    {
        name: 'Sommateur X6 Black Edition',
        mkr:  {name: 'Eowave'},
        hp:   5
    },
    {
        name: 'Angle Grinder',
        mkr:  {name: 'Schlappi Engineering'},
        hp:   18
    },
    {
        name: 'Jena',
        mkr:  {name: 'Xaoc Devices'},
        hp:   8
    },
    {
        name: 'Pico Drive',
        mkr:  {name: 'Erica Synths'},
        hp:   3
    },
    {
        name: 'SubMix6',
        mkr:  {name: 'Low-Gain Electronics'},
        hp:   8
    },
    {
        name: 'Dunst',
        mkr:  {name: 'Ieaskul F. Mobenthey'},
        hp:   8
    },
    {
        name: 'A-104',
        mkr:  {name: 'Doepfer'},
        hp:   20
    },
    {
        name: 'Cursus Iteritas Percido',
        mkr:  {name: 'Noise Engineering'},
        hp:   24
    },
    {
        name: 'MMF-2',
        mkr:  {name: 'Cwejman'},
        hp:   26
    },
    {
        name: 'MIX - Passive Mixer/Attenuator/Averager',
        mkr:  {name: 'Synthrotek'},
        hp:   2
    },
    {
        name: 'Chimera (Black)',
        mkr:  {name: 'WMD'},
        hp:   8
    },
    {
        name: 'TWS+ with AC mod',
        mkr:  {name: 'Random*Source'},
        hp:   18
    },
    {
        name: 'Stages (PCB Panel)',
        mkr:  {name: 'Oscillosaurus'},
        hp:   14
    },
    {
        name: 'Entropy2',
        mkr:  {name: 'Z?ob'},
        hp:   3
    },
    {
        name: 'Antiphon',
        mkr:  {name: 'Dreadbox'},
        hp:   42
    },
    {
        name: 'nRings (Black/Gold)',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'Touchplate Keyboard',
        mkr:  {name: 'Verbos Electronics'},
        hp:   84
    },
    {
        name: 'Invert Mix',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   2
    },
    {
        name: 'Q-010 Easy Quantizer (W/Y/R knobs)',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Analog Delay Unit',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   6
    },
    {
        name: 'Attenumixer',
        mkr:  {name: 'Z?ob'},
        hp:   4
    },
    {
        name: 'R-110',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Quad Operator',
        mkr:  {name: 'Humble Audio'},
        hp:   30
    },
    {
        name: 'Clock O\' Pawn',
        mkr:  {name: 'Shakmat Modular'},
        hp:   6
    },
    {
        name: 'Mutant snare (original colour)',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   13
    },
    {
        name: 'DIY BBD Delay',
        mkr:  {name: 'Erica Synths'},
        hp:   14
    },
    {
        name: 'A-142-1',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'uO_C Textured Magpie Panel',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'BASS 522',
        mkr:  {name: 'MFB'},
        hp:   8
    },
    {
        name: 'A-111-2v',
        mkr:  {name: 'Doepfer'},
        hp:   14
    },
    {
        name: 'Verb',
        mkr:  {name: 'Synthrotek'},
        hp:   4
    },
    {
        name: 'DVCA',
        mkr:  {name: 'WMD'},
        hp:   4
    },
    {
        name: 'ALT',
        mkr:  {name: 'NANO Modules'},
        hp:   8
    },
    {
        name: 'Gatestorm',
        mkr:  {name: 'Erogenous Tones'},
        hp:   24
    },
    {
        name: 'Tallin (black panel)',
        mkr:  {name: 'Xaoc Devices'},
        hp:   6
    },
    {
        name: 'm277 (updated version)',
        mkr:  {name: 'Trogotronic'},
        hp:   15
    },
    {
        name: 'Strom',
        mkr:  {name: 'KOMA Elektronik'},
        hp:   4
    },
    {
        name: 'Supercell (aluminum panel)',
        mkr:  {name: 'Grayscale'},
        hp:   34
    },
    {
        name: 'DETECT-Rx',
        mkr:  {name: 'Steady State Fate'},
        hp:   6
    },
    {
        name: 'Pulses Mk II (Black)',
        mkr:  {name: 'Music Thing Modular'},
        hp:   4
    },
    {
        name: 'A-111-6V',
        mkr:  {name: 'Doepfer'},
        hp:   10
    },
    {
        name: 'Loquelic Iteritas Percido (Black With Hardware)',
        mkr:  {name: 'Noise Engineering'},
        hp:   20
    },
    {
        name: 'Bloom (Silver Panel)',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   16
    },
    {
        name: 'MX-4S (White)',
        mkr:  {name: 'Cwejman'},
        hp:   20
    },
    {
        name: 'uTides v2',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'Minimod Dual LFO & VCA (Dark Edition)',
        mkr:  {name: 'AJH Synth'},
        hp:   10
    },
    {
        name: '3x Stereo Mixer',
        mkr:  {name: 'Happy Nerding'},
        hp:   6
    },
    {
        name: 'Nebulae V2 silver',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   20
    },
    {
        name: 'RADAR',
        mkr:  {name: 'Erogenous Tones'},
        hp:   28
    },
    {
        name: 'Maths Black Grayscale with Blue Knobs (Panel)',
        mkr:  {name: 'Grayscale'},
        hp:   null
    },
    {
        name: 'trig31',
        mkr:  {name: 'vpme.de'},
        hp:   28
    },
    {
        name: 'COPYCAT ( patchingpanda )',
        mkr:  {name: 'Patching Panda'},
        hp:   2
    },
    {
        name: 'HAIBLE DUAL WASP FILTER',
        mkr:  {name: 'Random*Source'},
        hp:   3
    },
    {
        name: 'FLXS1',
        mkr:  {name: 'Zetaohm'},
        hp:   8
    },
    {
        name: 'NerdSEQ CV16 Expander Black',
        mkr:  {name: 'XOR Electronics'},
        hp:   19
    },
    {
        name: 'Logic (Black Panel)',
        mkr:  {name: '2hp'},
        hp:   8
    },
    {
        name: 'Booster Stage',
        mkr:  {name: 'Bubblesound Instruments'},
        hp:   8
    },
    {
        name: '3x3x3 Passive Mult',
        mkr:  {name: 'WORNG Electronics'},
        hp:   16
    },
    {
        name: 'Altar',
        mkr:  {name: 'Ritual Electronics'},
        hp:   1
    },
    {
        name: 'Next Phase',
        mkr:  {name: 'AJH Synth'},
        hp:   12
    },
    {
        name: 'Plancks II (Silver)',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   8
    },
    {
        name: 'v3kt',
        mkr:  {name: 'Antimatter Audio'},
        hp:   8
    },
    {
        name: 'Black VC EG Expander',
        mkr:  {name: 'Erica Synths'},
        hp:   5
    },
    {
        name: 'F8R',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   16
    },
    {
        name: 'Variable Sync VCO',
        mkr:  {name: 'ACL'},
        hp:   16
    },
    {
        name: 'Black VCO2',
        mkr:  {name: 'Erica Synths'},
        hp:   12
    },
    {
        name: 'VC Divider',
        mkr:  {name: 'SSSR Labs'},
        hp:   4
    },
    {
        name: 'ECHOZ (WHITE)',
        mkr:  {name: 'Tiptop Audio'},
        hp:   8
    },
    {
        name: 'BLD-2',
        mkr:  {name: 'Cwejman'},
        hp:   24
    },
    {
        name: 'Performance Mixer LE',
        mkr:  {name: 'WMD'},
        hp:   50
    },
    {
        name: 'Lifeforms Dual VCA',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   8
    },
    {
        name: 'Entity Percussion Synthesizer (Black and Gold)',
        mkr:  {name: 'Steady State Fate'},
        hp:   14
    },
    {
        name: 'Peaks',
        mkr:  {name: 'Oscillosaurus'},
        hp:   null
    },
    {
        name: 'Graphic Sequencer',
        mkr:  {name: 'STG Soundlabs'},
        hp:   8
    },
    {
        name: 'Euphoria',
        mkr:  {name: 'Dreadbox'},
        hp:   6
    },
    {
        name: 'SWT16',
        mkr:  {name: 'Robaux'},
        hp:   20
    },
    {
        name: 'The Great Destroyer',
        mkr:  {name: 'Dwarfcraft Devices'},
        hp:   8
    },
    {
        name: 'ROW POWER 25',
        mkr:  {name: '4ms Company'},
        hp:   4
    },
    {
        name: 'RK4 Filter/VCO',
        mkr:  {name: 'Metasonix'},
        hp:   8
    },
    {
        name: 'twinVCFilter',
        mkr:  {name: 'Vermona'},
        hp:   24
    },
    {
        name: 'Blank Panel',
        mkr:  {name: 'Control'},
        hp:   3
    },
    {
        name: 'A-163',
        mkr:  {name: 'Doepfer'},
        hp:   8
    },
    {
        name: 'ED115 - SH-Noise',
        mkr:  {name: 'Elby Designs'},
        hp:   4
    },
    {
        name: 'Flux',
        mkr:  {name: 'IOLabs'},
        hp:   32
    },
    {
        name: 'Cinnamon - Black',
        mkr:  {name: 'Bastl Instruments'},
        hp:   5
    },
    {
        name: 'µ4xVCA',
        mkr:  {name: 'Codex Modulex'},
        hp:   8
    },
    {
        name: 'DSO150 EuroScope v2.0',
        mkr:  {name: 'Plum Audio'},
        hp:   14
    },
    {
        name: 'Stasis Leak',
        mkr:  {name: 'Frequency Central'},
        hp:   6
    },
    {
        name: 'RS-110',
        mkr:  {name: 'Analogue Systems'},
        hp:   18
    },
    {
        name: 'Mix 02',
        mkr:  {name: 'Rebel Technology'},
        hp:   10
    },
    {
        name: 'Beehive (Micro Plaits) Silver',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   8
    },
    {
        name: 'Monsoon',
        mkr:  {name: 'Warped Circuits'},
        hp:   12
    },
    {
        name: 'A-188-1B',
        mkr:  {name: 'Doepfer'},
        hp:   14
    },
    {
        name: 'A-184-2',
        mkr:  {name: 'Doepfer'},
        hp:   4
    },
    {
        name: 'Skew Fade LFO',
        mkr:  {name: 'Z?ob'},
        hp:   3
    },
    {
        name: 'Cat',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Black PFL',
        mkr:  {name: 'Erica Synths'},
        hp:   6
    },
    {
        name: 'Ground Control',
        mkr:  {name: 'Endorphin.es'},
        hp:   42
    },
    {
        name: 'DOT',
        mkr:  {name: 'Dnipro modular'},
        hp:   6
    },
    {
        name: 'Artificial Neural Network',
        mkr:  {name: 'ARC'},
        hp:   18
    },
    {
        name: 'Sine',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Gx',
        mkr:  {name: 'Intellijel'},
        hp:   4
    },
    {
        name: 'ADDAC102 VC FM Radio',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'Klang',
        mkr:  {name: 'Elektrofon'},
        hp:   14
    },
    {
        name: 'Vibrazum v2',
        mkr:  {name: 'Patching Panda'},
        hp:   14
    },
    {
        name: 'ADSR',
        mkr:  {name: 'PMFoundations'},
        hp:   4
    },
    {
        name: 'ADDAC104',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'Backend Filter',
        mkr:  {name: 'Macbeth Studio Systems'},
        hp:   42
    },
    {
        name: 'Atom (Magpie Panel)',
        mkr:  {name: 'Antumbra'},
        hp:   18
    },
    {
        name: 'Crush',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   8
    },
    {
        name: 'Quad Quantizer',
        mkr:  {name: 'Tenderfoot Electronics'},
        hp:   12
    },
    {
        name: 'Sine',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Rout',
        mkr:  {name: '2hp'},
        hp:   2
    },
    {
        name: 'Bass Drum',
        mkr:  {name: 'Erica Synths'},
        hp:   14
    },
    {
        name: 'Belgrad (black panel)',
        mkr:  {name: 'Xaoc Devices'},
        hp:   14
    },
    {
        name: '2hp Blank Panel',
        mkr:  {name: '4ms Company'},
        hp:   2
    },
    {
        name: 'Muskrat',
        mkr:  {name: 'Møffenzeef Mødular'},
        hp:   10
    },
    {
        name: 'Twin Peak MK2',
        mkr:  {name: 'Epoch Modular'},
        hp:   12
    },
    {
        name: 'AI010 Switching Attenuator',
        mkr:  {name: 'AI Synthesis'},
        hp:   2
    },
    {
        name: 'Blank 2Hp',
        mkr:  {name: 'NANO Modules'},
        hp:   2
    },
    {
        name: 'OCP - Ornament and Crime Plus (DIY)',
        mkr:  {name: 'Plum Audio'},
        hp:   14
    },
    {
        name: 'uGrids (Matte Black Aluminum)',
        mkr:  {name: 'CalSynth'},
        hp:   8
    },
    {
        name: 'Ultra Wave',
        mkr:  {name: 'Frequency Central'},
        hp:   10
    },
    {
        name: 'mod1',
        mkr:  {name: 'Waldorf'},
        hp:   30
    },
    {
        name: '3LFO',
        mkr:  {name: 'Takaab'},
        hp:   6
    },
    {
        name: 'Dual Looping Delay',
        mkr:  {name: '4ms Company'},
        hp:   20
    },
    {
        name: 'Sweet Sixteen Mk.II',
        mkr:  {name: 'Tesseract Modular'},
        hp:   24
    },
    {
        name: 'J-110 Derivator',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'GPI',
        mkr:  {name: 'Retro Mechanical Labs'},
        hp:   8
    },
    {
        name: 'Peaks',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'PM Mutes Expander (Black)',
        mkr:  {name: 'WMD'},
        hp:   6
    },
    {
        name: 'Castle 000 ADC',
        mkr:  {name: 'LZX Industries'},
        hp:   null
    },
    {
        name: 'VCA Matrix (System +5V)',
        mkr:  {name: '4ms Company'},
        hp:   24
    },
    {
        name: 'Nerdseq - CV Expander Grey',
        mkr:  {name: 'XOR Electronics'},
        hp:   4
    },
    {
        name: 'Pachinko',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   8
    },
    {
        name: 'A-121-2v',
        mkr:  {name: 'Doepfer'},
        hp:   24
    },
    {
        name: 'Pico VC EG',
        mkr:  {name: 'Erica Synths'},
        hp:   3
    },
    {
        name: 'TRSHMSTR (Black)',
        mkr:  {name: 'WMD'},
        hp:   12
    },
    {
        name: 'Arpeggiator 2013',
        mkr:  {name: 'Flame'},
        hp:   15
    },
    {
        name: 'MA808 (WHITE)',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: 'A-174-4 Joy Stick II Black Edition',
        mkr:  {name: 'Doepfer'},
        hp:   12
    },
    {
        name: 'Sonveskañ',
        mkr:  {name: 'TouellSkouarn'},
        hp:   16
    },
    {
        name: 'Wavefront',
        mkr:  {name: 'Genki Instruments'},
        hp:   4
    },
    {
        name: 'Edgecutter',
        mkr:  {name: 'Tinrs'},
        hp:   12
    },
    {
        name: 'Rhythm',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   28
    },
    {
        name: 'VCO - Analog Voltage Controlled Oscillator',
        mkr:  {name: 'Synthrotek'},
        hp:   4
    },
    {
        name: 'MATRIX II',
        mkr:  {name: 'Alyseum'},
        hp:   22
    },
    {
        name: 'Flexshaper',
        mkr:  {name: 'Klavis'},
        hp:   6
    },
    {
        name: 'DROID P2B8 Controller',
        mkr:  {name: 'Der Mann mit der Maschine'},
        hp:   5
    },
    {
        name: 'RIT_M RhythmSequencer',
        mkr:  {name: 'SDS Digital'},
        hp:   4
    },
    {
        name: 'ADDAC304',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'uniCYCLE',
        mkr:  {name: 'Vermona'},
        hp:   10
    },
    {
        name: 'ESX-8MD mk2',
        mkr:  {name: 'Expert Sleepers'},
        hp:   10
    },
    {
        name: 'Pixel Dust',
        mkr:  {name: 'omsonic'},
        hp:   6
    },
    {
        name: 'ADDAC402 4 Voice Heuristic Rhythm Generator',
        mkr:  {name: 'ADDAC System'},
        hp:   20
    },
    {
        name: 'Model 52 Vampire',
        mkr:  {name: 'Subconscious Communications'},
        hp:   21
    },
    {
        name: 'SDS_VCO',
        mkr:  {name: 'SDS Digital'},
        hp:   3
    },
    {
        name: 'Rack Plumber',
        mkr:  {name: 'Plum Audio'},
        hp:   4
    },
    {
        name: 'cmp1',
        mkr:  {name: 'Waldorf'},
        hp:   20
    },
    {
        name: 'Peak+Hold',
        mkr:  {name: 'CG Products'},
        hp:   null
    },
    {
        name: 'Pachinko (Black)',
        mkr:  {name: 'CalSynth'},
        hp:   4
    },
    {
        name: 'Black Midi-CV',
        mkr:  {name: 'Erica Synths'},
        hp:   12
    },
    {
        name: 'Cockpit2 (Black)',
        mkr:  {name: 'Endorphin.es'},
        hp:   null
    },
    {
        name: 'J-120 Comparator',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Multi Function Discrete VCO',
        mkr:  {name: 'ACL'},
        hp:   26
    },
    {
        name: 'MOK Waverazor Dual Oscillator',
        mkr:  {name: '1010 Music'},
        hp:   26
    },
    {
        name: 'Makrow',
        mkr:  {name: 'Future Sound Systems'},
        hp:   8
    },
    {
        name: 'System X Dual ADSR',
        mkr:  {name: 'Frequency Central'},
        hp:   10
    },
    {
        name: 'EUCRHYTHM',
        mkr:  {name: 'Hikari Instruments'},
        hp:   8
    },
    {
        name: 'FFB 914',
        mkr:  {name: 'AJH Synth'},
        hp:   30
    },
    {
        name: 'XVCO TWO',
        mkr:  {name: 'Frequency Central'},
        hp:   10
    },
    {
        name: 'Fractio Solum',
        mkr:  {name: 'Noise Engineering'},
        hp:   4
    },
    {
        name: 'The Great Destroyer 2017',
        mkr:  {name: 'Dwarfcraft Devices'},
        hp:   6
    },
    {
        name: '4xMUTE - black',
        mkr:  {name: 'Happy Nerding'},
        hp:   4
    },
    {
        name: 'Neutron (Euroracked Aluminium Panel)',
        mkr:  {name: 'Behringer'},
        hp:   80
    },
    {
        name: 'Knit Rider Aluminium Panel',
        mkr:  {name: 'Bastl Instruments'},
        hp:   16
    },
    {
        name: 'S-143',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Alter 1/2 (Gold)',
        mkr:  {name: 'Folktek'},
        hp:   16
    },
    {
        name: 'bong0',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   4
    },
    {
        name: 'Pulses Mk II (Black Panel)',
        mkr:  {name: 'Music Thing Modular'},
        hp:   null
    },
    {
        name: 'RS-380',
        mkr:  {name: 'Analogue Systems'},
        hp:   12
    },
    {
        name: 'AWM-3',
        mkr:  {name: 'Vintage Synth Lab'},
        hp:   16
    },
    {
        name: 'DIY Output module',
        mkr:  {name: 'Erica Synths'},
        hp:   6
    },
    {
        name: 'Dynamo (Aluminum)',
        mkr:  {name: 'Bastl Instruments'},
        hp:   5
    },
    {
        name: 'Dual Discrete VCA',
        mkr:  {name: 'KOMA Elektronik'},
        hp:   10
    },
    {
        name: 'MULT',
        mkr:  {name: 'Adventure Audio'},
        hp:   2
    },
    {
        name: 'Basic VCO',
        mkr:  {name: 'L-1'},
        hp:   10
    },
    {
        name: 'Lifeforms Touch Controller',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   null
    },
    {
        name: 'Cockpit²',
        mkr:  {name: 'Endorphin.es'},
        hp:   4
    },
    {
        name: '1BIT Multitap Delay',
        mkr:  {name: 'Feedback'},
        hp:   4
    },
    {
        name: 'KLIK',
        mkr:  {name: 'Antumbra'},
        hp:   16
    },
    {
        name: 'Propust (Aluminium)',
        mkr:  {name: 'Bastl Instruments'},
        hp:   2
    },
    {
        name: 'SMIX',
        mkr:  {name: 'Takaab'},
        hp:   2
    },
    {
        name: 'nRings (Black)',
        mkr:  {name: 'Warped Circuits'},
        hp:   8
    },
    {
        name: 'R-120 Random CV',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'RK6 resonant lowpass filter',
        mkr:  {name: 'Metasonix'},
        hp:   8
    },
    {
        name: 'Euporie',
        mkr:  {name: 'IO Instruments'},
        hp:   12
    },
    {
        name: 'TT / CO / CL 522',
        mkr:  {name: 'MFB'},
        hp:   12
    },
    {
        name: 'PanMix Jr',
        mkr:  {name: 'Happy Nerding'},
        hp:   6
    },
    {
        name: 'Event',
        mkr:  {name: 'Rat King Modular'},
        hp:   8
    },
    {
        name: 'Octone (Black)',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   10
    },
    {
        name: 'Entropic Doom',
        mkr:  {name: 'AJH Synth'},
        hp:   14
    },
    {
        name: 'OR Switch (AFRORACK and Ali The Architect collab edition) black',
        mkr:  {name: 'North Coast Modular Collective'},
        hp:   3
    },
    {
        name: 'A-188-1Y',
        mkr:  {name: 'Doepfer'},
        hp:   14
    },
    {
        name: 'Atari Punk Console',
        mkr:  {name: 'Synthrotek'},
        hp:   4
    },
    {
        name: 'Talko',
        mkr:  {name: 'Polaxis'},
        hp:   10
    },
    {
        name: 'uBermuda',
        mkr:  {name: 'Noise Reap'},
        hp:   6
    },
    {
        name: 'VC ADSR',
        mkr:  {name: 'L-1'},
        hp:   22
    },
    {
        name: 'A-173-1',
        mkr:  {name: 'Doepfer'},
        hp:   6
    },
    {
        name: 'UL1 uloop',
        mkr:  {name: 'Soundmachines'},
        hp:   4
    },
    {
        name: 'CHORD MACHINE 2 (2017)',
        mkr:  {name: 'Flame'},
        hp:   12
    },
    {
        name: 'Dual State Variable VCF',
        mkr:  {name: 'ACL'},
        hp:   26
    },
    {
        name: 'Humpback (New Panel)',
        mkr:  {name: 'God\'s Box'},
        hp:   8
    },
    {
        name: 'A-188-1A',
        mkr:  {name: 'Doepfer'},
        hp:   14
    },
    {
        name: 'ADDAC800X High-End Outputs',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'Clump',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   24
    },
    {
        name: 'Spectral Multiband Resonator',
        mkr:  {name: '4ms Company'},
        hp:   26
    },
    {
        name: 'Chaos Brother',
        mkr:  {name: 'Snazzy FX'},
        hp:   10
    },
    {
        name: 'AD/LFO-V',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   12
    },
    {
        name: 'MBC-3',
        mkr:  {name: 'Cwejman'},
        hp:   42
    },
    {
        name: 'Snare Drum',
        mkr:  {name: 'Erica Synths'},
        hp:   10
    },
    {
        name: 'Graphic EQ (Black Panel)',
        mkr:  {name: 'Music Thing Modular'},
        hp:   6
    },
    {
        name: 'E-OR',
        mkr:  {name: 'Eurorack Hardware'},
        hp:   2
    },
    {
        name: 'Multiples',
        mkr:  {name: 'L-1'},
        hp:   2
    },
    {
        name: 'Bus Mult',
        mkr:  {name: 'Møffenzeef Mødular'},
        hp:   2
    },
    {
        name: 'PLAGWITZ mk2',
        mkr:  {name: 'LPZW.modules'},
        hp:   6
    },
    {
        name: 'OSC2 Recombination Engine',
        mkr:  {name: 'Future Sound Systems'},
        hp:   32
    },
    {
        name: 'Brain Custard',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   12
    },
    {
        name: '2xVCA',
        mkr:  {name: 'Noise Reap'},
        hp:   8
    },
    {
        name: 'SM-1',
        mkr:  {name: 'Cwejman'},
        hp:   56
    },
    {
        name: '2.4SINK',
        mkr:  {name: 'Instruments of Things'},
        hp:   10
    },
    {
        name: 'ADDAC501 Complex Random VS2',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'Baron Samedi',
        mkr:  {name: 'Animal Factory Amplification'},
        hp:   12
    },
    {
        name: 'DTA - Discrete Transistor Amplifier',
        mkr:  {name: 'Manhattan Analog'},
        hp:   4
    },
    {
        name: 'VC Dual Amp',
        mkr:  {name: 'ACL'},
        hp:   10
    },
    {
        name: 'Paradox',
        mkr:  {name: 'Noise Reap'},
        hp:   8
    },
    {
        name: 'Surface (Silver)',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   10
    },
    {
        name: 'RS-85',
        mkr:  {name: 'Analogue Systems'},
        hp:   12
    },
    {
        name: 'Unknown Pleasures',
        mkr:  {name: 'Razmasynth'},
        hp:   6
    },
    {
        name: 'Coherence',
        mkr:  {name: 'Metabolic Devices'},
        hp:   16
    },
    {
        name: '4xMUTE',
        mkr:  {name: 'Happy Nerding'},
        hp:   4
    },
    {
        name: 'TRAX!',
        mkr:  {name: 'Futureretro'},
        hp:   6
    },
    {
        name: 'Dual ADSR',
        mkr:  {name: 'SoundForce'},
        hp:   20
    },
    {
        name: 'Listen up',
        mkr:  {name: '4ms Company'},
        hp:   4
    },
    {
        name: 'B-020 Bool3 – logic module',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'ADDAC805.VS2',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'Oktave',
        mkr:  {name: 'ACL'},
        hp:   6
    },
    {
        name: 'DIST',
        mkr:  {name: 'Antumbra'},
        hp:   null
    },
    {
        name: 'Resonate',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   4
    },
    {
        name: 'Snake Charmer Out',
        mkr:  {name: 'Praxis Electronics'},
        hp:   5
    },
    {
        name: 'Oscitron',
        mkr:  {name: 'Soulsby'},
        hp:   12
    },
    {
        name: 'Kong',
        mkr:  {name: 'Bastl Instruments'},
        hp:   14
    },
    {
        name: 'Squeeze',
        mkr:  {name: 'Feedback'},
        hp:   12
    },
    {
        name: 'Antumbra Knit',
        mkr:  {name: 'Warped Circuits'},
        hp:   8
    },
    {
        name: 'ADSR',
        mkr:  {name: 'Recovery Effects and Devices'},
        hp:   2
    },
    {
        name: 'Passive Multiple',
        mkr:  {name: 'Arcus Audio'},
        hp:   2
    },
    {
        name: 'Polivoks Modulator II',
        mkr:  {name: 'Erica Synths'},
        hp:   8
    },
    {
        name: 'CB808 (WHITE)',
        mkr:  {name: 'Tiptop Audio'},
        hp:   4
    },
    {
        name: 'Model 158',
        mkr:  {name: 'Red Panel'},
        hp:   14
    },
    {
        name: 'HONEYEATER',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'ES07 - 1973 VCF',
        mkr:  {name: 'Elby Designs'},
        hp:   14
    },
    {
        name: 'Combine-OR',
        mkr:  {name: 'Synthrotek'},
        hp:   12
    },
    {
        name: 'Mix 03',
        mkr:  {name: 'Rebel Technology'},
        hp:   6
    },
    {
        name: 'VVCA: Velocity VCA',
        mkr:  {name: 'Majella Audio'},
        hp:   4
    },
    {
        name: 'Lil\' Monster VCO',
        mkr:  {name: 'AniModule'},
        hp:   8
    },
    {
        name: 'Dannysound MM VCA',
        mkr:  {name: 'Thonk'},
        hp:   6
    },
    {
        name: 'C-011 Precision dual lag/slew limiter',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Aith?r',
        mkr:  {name: 'Instru?'},
        hp:   12
    },
    {
        name: 'Saber',
        mkr:  {name: 'Delta Sound Labs'},
        hp:   8
    },
    {
        name: 'Entropy Expander',
        mkr:  {name: 'Z?ob'},
        hp:   3
    },
    {
        name: 'Enigma',
        mkr:  {name: 'After Later Audio'},
        hp:   4
    },
    {
        name: '3080-VCO',
        mkr:  {name: 'PMFoundations'},
        hp:   6
    },
    {
        name: 'DVCA',
        mkr:  {name: 'Korb-Modular'},
        hp:   null
    },
    {
        name: 'GATE MIX',
        mkr:  {name: 'ACL'},
        hp:   8
    },
    {
        name: 'A-541',
        mkr:  {name: 'Ladik'},
        hp:   8
    },
    {
        name: 'Addac801 simple mixer',
        mkr:  {name: 'ADDAC System'},
        hp:   14
    },
    {
        name: 'VIII',
        mkr:  {name: 'Razmasynth'},
        hp:   4
    },
    {
        name: 'RS909 (WHITE)',
        mkr:  {name: 'Tiptop Audio'},
        hp:   2
    },
    {
        name: 'µPlaits SE (uPlaits, microPlaits) [Rev B, Black]',
        mkr:  {name: 'Tall Dog'},
        hp:   8
    },
    {
        name: 'µMotion',
        mkr:  {name: 'Codex Modulex'},
        hp:   8
    },
    {
        name: 'Crow',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   4
    },
    {
        name: 'Test 3',
        mkr:  {name: 'Joranalogue Audio Design'},
        hp:   8
    },
    {
        name: 'Memory Joystick',
        mkr:  {name: 'Flame'},
        hp:   10
    },
    {
        name: '4-Band Distortion,Mög D-2',
        mkr:  {name: 'DPW Design'},
        hp:   10
    },
    {
        name: 'Seca Ruina (Silver)',
        mkr:  {name: 'Noise Engineering'},
        hp:   6
    },
    {
        name: 'Monsoon',
        mkr:  {name: 'Big T Music'},
        hp:   12
    },
    {
        name: 'A-112v',
        mkr:  {name: 'Doepfer'},
        hp:   10
    },
    {
        name: 'Irukandji Glitch Drum VCO',
        mkr:  {name: 'Beast-Tek'},
        hp:   14
    },
    {
        name: '2600 VCO',
        mkr:  {name: 'Steffcorp'},
        hp:   14
    },
    {
        name: 'Micrón',
        mkr:  {name: 'Olitronik Circuits'},
        hp:   8
    },
    {
        name: 'Shuttle System BLCK_EDITION',
        mkr:  {name: 'Endorphin.es'},
        hp:   84
    },
    {
        name: 'SPICE VCF',
        mkr:  {name: 'Plankton Electronics'},
        hp:   6
    },
    {
        name: 'D-430 Drum Boy',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: '820',
        mkr:  {name: 'System80'},
        hp:   10
    },
    {
        name: 'VM-1S (grey)',
        mkr:  {name: 'Cwejman'},
        hp:   26
    },
    {
        name: 'nanoRings (Aluminum)',
        mkr:  {name: 'CalSynth'},
        hp:   8
    },
    {
        name: '2180 VCF',
        mkr:  {name: 'L-1'},
        hp:   10
    },
    {
        name: 'CV/Gate Expander',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   3
    },
    {
        name: 'ADSR',
        mkr:  {name: 'Grp'},
        hp:   6
    },
    {
        name: 'Kamieniec (black panel)',
        mkr:  {name: 'Xaoc Devices'},
        hp:   9
    },
    {
        name: 'Overfolder',
        mkr:  {name: 'VBrazil Systems'},
        hp:   6
    },
    {
        name: 'PAN',
        mkr:  {name: 'Bubblesound Instruments'},
        hp:   4
    },
    {
        name: 'Expert Sleepers ES-8 (alternate panel)',
        mkr:  {name: 'Grayscale'},
        hp:   8
    },
    {
        name: 'Deep Thought',
        mkr:  {name: 'Frequency Central'},
        hp:   10
    },
    {
        name: 'Stumm',
        mkr:  {name: 'Future Sound Systems'},
        hp:   8
    },
    {
        name: 'Low Coast',
        mkr:  {name: 'Tesseract Modular'},
        hp:   6
    },
    {
        name: 'Pico VCA2',
        mkr:  {name: 'Erica Synths'},
        hp:   3
    },
    {
        name: 'FIL-1 Convulsion Generator',
        mkr:  {name: 'Future Sound Systems'},
        hp:   6
    },
    {
        name: 'Spectral Processor',
        mkr:  {name: 'Sputnik Modular'},
        hp:   null
    },
    {
        name: '8x8 Buffered Matrix',
        mkr:  {name: 'Tesseract Modular'},
        hp:   12
    },
    {
        name: 'Stereomix 2 (Silver Panel)',
        mkr:  {name: 'Toppobrillo'},
        hp:   24
    },
    {
        name: 'Overdrive',
        mkr:  {name: 'Oakley'},
        hp:   6
    },
    {
        name: '2xVCX',
        mkr:  {name: 'RYO'},
        hp:   8
    },
    {
        name: 'A-570',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Kareishuu VCO',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   10
    },
    {
        name: 'Palaces (Gold)',
        mkr:  {name: 'Folktek'},
        hp:   null
    },
    {
        name: '810',
        mkr:  {name: 'System80'},
        hp:   10
    },
    {
        name: 'Stereo Out Module',
        mkr:  {name: 'Grp'},
        hp:   16
    },
    {
        name: 'Permutation (18hp)',
        mkr:  {name: 'Grayscale'},
        hp:   18
    },
    {
        name: 'Dopes',
        mkr:  {name: 'Noise Reap'},
        hp:   8
    },
    {
        name: 'Salt',
        mkr:  {name: 'Rebel Technology'},
        hp:   12
    },
    {
        name: 'Tonus VCF (Black Panel Version)',
        mkr:  {name: 'G-Storm Electro'},
        hp:   12
    },
    {
        name: 'Chipz (Ltd. panel)',
        mkr:  {name: 'Cre8audio'},
        hp:   12
    },
    {
        name: 'SP-1P',
        mkr:  {name: 'Synthwerks'},
        hp:   8
    },
    {
        name: 'ADDAC202 Amplifiers',
        mkr:  {name: 'ADDAC System'},
        hp:   4
    },
    {
        name: 'Wangernumb',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   14
    },
    {
        name: 'Kriket',
        mkr:  {name: 'Møffenzeef Mødular'},
        hp:   8
    },
    {
        name: 'Formant Filter',
        mkr:  {name: 'Modor Music'},
        hp:   16
    },
    {
        name: 'D-420 Drum Girl',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Dual LFO/VCO',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'FREESTYLO',
        mkr:  {name: 'XOR Electronics'},
        hp:   6
    },
    {
        name: 'MicroTides (Black w/ LED Attenuverters)',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   8
    },
    {
        name: 'FSR 4',
        mkr:  {name: 'Synthwerks'},
        hp:   16
    },
    {
        name: 'Lorem Ipsum 4',
        mkr:  {name: 'Noise Engineering'},
        hp:   4
    },
    {
        name: 'PURE S&H',
        mkr:  {name: 'GMSN!'},
        hp:   4
    },
    {
        name: 'ADSR 6hp version',
        mkr:  {name: 'Circuit Slices'},
        hp:   6
    },
    {
        name: 'ADDAC802R',
        mkr:  {name: 'ADDAC System'},
        hp:   12
    },
    {
        name: 'Jupiter Spirits',
        mkr:  {name: 'Recovery Effects and Devices'},
        hp:   12
    },
    {
        name: 'ADDAC307',
        mkr:  {name: 'ADDAC System'},
        hp:   4
    },
    {
        name: 'CEM Osc',
        mkr:  {name: 'Frequency Central'},
        hp:   10
    },
    {
        name: 'Peaks (White / Gold Panel)',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'Amnesia',
        mkr:  {name: 'DinSync'},
        hp:   8
    },
    {
        name: 'A-101-1v',
        mkr:  {name: 'Doepfer'},
        hp:   16
    },
    {
        name: 'modDemix (Grayscale black panel)',
        mkr:  {name: 'Grayscale'},
        hp:   6
    },
    {
        name: 'Aeolus Mixer',
        mkr:  {name: 'Shakmat Modular'},
        hp:   6
    },
    {
        name: 'Broken Tape Simulator',
        mkr:  {name: 'Error Instruments'},
        hp:   6
    },
    {
        name: 'Tagh',
        mkr:  {name: 'Instru?'},
        hp:   14
    },
    {
        name: 'Hilbert curve fractal blank panel',
        mkr:  {name: 'Z?ob'},
        hp:   3
    },
    {
        name: 'P-060 Switches',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'U-081',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Descent',
        mkr:  {name: 'Sonic Potions'},
        hp:   6
    },
    {
        name: 'VUM',
        mkr:  {name: 'CaviSynth'},
        hp:   4
    },
    {
        name: 'Permutation (6hp)',
        mkr:  {name: 'Grayscale'},
        hp:   6
    },
    {
        name: 'SDSV+',
        mkr:  {name: 'Timo Rozendal'},
        hp:   null
    },
    {
        name: 'ADDAC601 VC Fixed Filter Bank (black)',
        mkr:  {name: 'ADDAC System'},
        hp:   16
    },
    {
        name: 'Model 53 Voicetail',
        mkr:  {name: 'Subconscious Communications'},
        hp:   21
    },
    {
        name: 'Dual LFO',
        mkr:  {name: 'Grp'},
        hp:   6
    },
    {
        name: 'TONUS VCF',
        mkr:  {name: 'G-Storm Electro'},
        hp:   12
    },
    {
        name: 'U-012 Dual Attenuverter + DC',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'M-053 3-ch Aux Mixer',
        mkr:  {name: 'Ladik'},
        hp:   8
    },
    {
        name: 'L-122 Uncertain LFO',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'ENVy',
        mkr:  {name: 'After Later Audio'},
        hp:   6
    },
    {
        name: 'synesthesia',
        mkr:  {name: 'Folktek'},
        hp:   10
    },
    {
        name: 'Timo Rozendal Logic',
        mkr:  {name: 'Timo Rozendal'},
        hp:   4
    },
    {
        name: 'Mutant Snare Diy',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   13
    },
    {
        name: 'SUM 2',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'BOOLs',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   10
    },
    {
        name: 'ES15 - Stepped & Smooth Generator',
        mkr:  {name: 'Elby Designs'},
        hp:   17
    },
    {
        name: 'Quiet (Gold)',
        mkr:  {name: 'Folktek'},
        hp:   6
    },
    {
        name: 'ease',
        mkr:  {name: 'Tenderfoot Electronics'},
        hp:   4
    },
    {
        name: 'L-127 Delayed LFO',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Mutant Machine (original colour)',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   29
    },
    {
        name: 'PATH',
        mkr:  {name: 'Antumbra'},
        hp:   null
    },
    {
        name: 't_? Micro Temps_Utile',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   12
    },
    {
        name: 'Sirius',
        mkr:  {name: 'Serpens Modular'},
        hp:   12
    },
    {
        name: 'TRAM8 3U',
        mkr:  {name: 'LPZW.modules'},
        hp:   5
    },
    {
        name: 'TheBateleur - Power / MIDI',
        mkr:  {name: 'birdkids'},
        hp:   12
    },
    {
        name: 'Microbe',
        mkr:  {name: 'Beast-Tek'},
        hp:   10
    },
    {
        name: 'Sloth Chaos 4hp',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   4
    },
    {
        name: 'µOsc-I',
        mkr:  {name: 'Codex Modulex'},
        hp:   8
    },
    {
        name: 'Triple Bipolar VCA (BLACK)',
        mkr:  {name: 'WMD'},
        hp:   8
    },
    {
        name: 'LVL+rm',
        mkr:  {name: 'Bubblesound Instruments'},
        hp:   8
    },
    {
        name: 'LED Meter (Blue)',
        mkr:  {name: 'Happy Nerding'},
        hp:   4
    },
    {
        name: 'Mutable Instruments Blinds (Grayscale panel)',
        mkr:  {name: 'Grayscale'},
        hp:   null
    },
    {
        name: 'Heklev',
        mkr:  {name: 'TouellSkouarn'},
        hp:   12
    },
    {
        name: 'ADDAC305',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: 'Mycelium Synthesizer',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   12
    },
    {
        name: 'Hilbert curve fractal blank panel',
        mkr:  {name: 'Z?ob'},
        hp:   6
    },
    {
        name: 'Theta',
        mkr:  {name: 'Dreadbox'},
        hp:   20
    },
    {
        name: 'FK1T VCF',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'PS3100 Triple Vactrol Resonators',
        mkr:  {name: 'Fonitronik'},
        hp:   20
    },
    {
        name: 'BC - Breath Control',
        mkr:  {name: 'PulpLogic'},
        hp:   4
    },
    {
        name: 'Algorhythm (black panel)',
        mkr:  {name: 'Grayscale'},
        hp:   12
    },
    {
        name: 'Quadrangle',
        mkr:  {name: 'Synthrotek'},
        hp:   20
    },
    {
        name: 'Echophon (Grayscale black panel)',
        mkr:  {name: 'Grayscale'},
        hp:   20
    },
    {
        name: 'Little Melody',
        mkr:  {name: 'Frequency Central'},
        hp:   null
    },
    {
        name: 'A-580 1x line out/ 2x line in',
        mkr:  {name: 'Ladik'},
        hp:   10
    },
    {
        name: 'Lumanoise 808 Cymbal Drone Generator',
        mkr:  {name: 'Laboratorio Elettronico Popolare'},
        hp:   22
    },
    {
        name: 'Triple Sloth',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   10
    },
    {
        name: 'AM8012 ARP 2600P Filter',
        mkr:  {name: 'AMSynths'},
        hp:   20
    },
    {
        name: 'A-525',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Threshold (Black Panel)',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   12
    },
    {
        name: 'PMult',
        mkr:  {name: 'York Modular'},
        hp:   10
    },
    {
        name: 'Gait (Gold)',
        mkr:  {name: 'Folktek'},
        hp:   6
    },
    {
        name: 'F-711 SV-VCF',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Fan Synth',
        mkr:  {name: 'Mutant Modular'},
        hp:   4
    },
    {
        name: 'STEREO SUM CHANNEL',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'M-610 6ch stereo slider mixer',
        mkr:  {name: 'Ladik'},
        hp:   2
    },
    {
        name: 'C-217 DADSR Delayed Envelope',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'F-1: Stereo Lowpass Filter',
        mkr:  {name: 'Strange Science Instruments'},
        hp:   16
    },
    {
        name: 'GENiE',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   12
    },
    {
        name: 'Selecta - reversible panel',
        mkr:  {name: 'Tesseract Modular'},
        hp:   8
    },
    {
        name: 'Crave',
        mkr:  {name: 'Behringer'},
        hp:   64
    },
    {
        name: 'Mult',
        mkr:  {name: 'TomaTek-Audio'},
        hp:   2
    },
    {
        name: 'CP3-',
        mkr:  {name: 'Feedback'},
        hp:   6
    },
    {
        name: 'Gibbon',
        mkr:  {name: 'Pittsburgh Modular'},
        hp:   4
    },
    {
        name: 'Thomas Henry SN Voice',
        mkr:  {name: 'synthCube'},
        hp:   28
    },
    {
        name: 'S-187 Voltage Controlled Clock/Trig/Gate Modifier',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'crossfade',
        mkr:  {name: 'Noise Reap'},
        hp:   4
    },
    {
        name: 'JP6-VCF',
        mkr:  {name: 'G-Storm Electro'},
        hp:   8
    },
    {
        name: '.VCO',
        mkr:  {name: 'STG Soundlabs'},
        hp:   null
    },
    {
        name: 'ADDAC216',
        mkr:  {name: 'ADDAC System'},
        hp:   8
    },
    {
        name: '4027 VCO',
        mkr:  {name: 'G-Storm Electro'},
        hp:   10
    },
    {
        name: 'USB bridge A',
        mkr:  {name: 'Tubbutec'},
        hp:   2
    },
    {
        name: 'VLH - VCO\'s Little Helper',
        mkr:  {name: 'Takaab'},
        hp:   2
    },
    {
        name: 'Thomas Henry 2164 VCF/VCA',
        mkr:  {name: 'Fonitronik'},
        hp:   16
    },
    {
        name: 'PURE Sequencer',
        mkr:  {name: 'GMSN!'},
        hp:   24
    },
    {
        name: 'Teenage Engineering PO-12',
        mkr:  {name: 'LPZW.modules'},
        hp:   12
    },
    {
        name: 'Attenuator',
        mkr:  {name: 'L-1'},
        hp:   6
    },
    {
        name: 'Dual Digital Shift Register',
        mkr:  {name: 'Omiindustriies'},
        hp:   8
    },
    {
        name: 'Altered States',
        mkr:  {name: 'RYO'},
        hp:   20
    },
    {
        name: 'DU-INO',
        mkr:  {name: 'Detroit Underground'},
        hp:   14
    },
    {
        name: 'Bizmuth (Black LTD)',
        mkr:  {name: 'Bizmuth Modular'},
        hp:   null
    },
    {
        name: 'QMIX',
        mkr:  {name: 'Neutron Sound'},
        hp:   8
    },
    {
        name: 'Skew Fade LFO(B/W)',
        mkr:  {name: 'Z?ob'},
        hp:   3
    },
    {
        name: 'BLN',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   2
    },
    {
        name: 'Logic Bomb',
        mkr:  {name: 'Frequency Central'},
        hp:   6
    },
    {
        name: 'CGS93 (1-8)',
        mkr:  {name: 'Elby Designs'},
        hp:   4
    },
    {
        name: 'BMC25 FM Drum',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   null
    },
    {
        name: 'Metal-O-Tron II',
        mkr:  {name: 'Skull & Circuits'},
        hp:   16
    },
    {
        name: 'Warhorse',
        mkr:  {name: 'Arcaico'},
        hp:   16
    },
    {
        name: 'Helvetica Scenario',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'Timber - Black',
        mkr:  {name: 'Bastl Instruments'},
        hp:   7
    },
    {
        name: 'ADDAC222',
        mkr:  {name: 'ADDAC System'},
        hp:   16
    },
    {
        name: 'Contour (Grayscale black panel)',
        mkr:  {name: 'Grayscale'},
        hp:   8
    },
    {
        name: 'Triple Attenuator',
        mkr:  {name: 'Serpens Modular'},
        hp:   4
    },
    {
        name: 'mSSP',
        mkr:  {name: 'Percussa'},
        hp:   26
    },
    {
        name: 'ASR Envelope',
        mkr:  {name: 'Kassutronics'},
        hp:   4
    },
    {
        name: 'Vox Digitalis (Silver)',
        mkr:  {name: 'Noise Engineering'},
        hp:   4
    },
    {
        name: 'MSK 013 Middle Path VCO',
        mkr:  {name: 'North Coast Synthesis'},
        hp:   24
    },
    {
        name: 'VU002',
        mkr:  {name: 'Syntonie'},
        hp:   null
    },
    {
        name: 'Eurobuffer BMC037',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   6
    },
    {
        name: '8HP Blank Panel',
        mkr:  {name: 'Elby Designs'},
        hp:   13
    },
    {
        name: '4hp Multiples',
        mkr:  {name: 'L-1'},
        hp:   8
    },
    {
        name: 'Filter Threek 13700',
        mkr:  {name: 'Funkstill'},
        hp:   14
    },
    {
        name: 'FRANZ',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'TABØR - orb black panel',
        mkr:  {name: 'Jolin Lab'},
        hp:   12
    },
    {
        name: 'FM Joystick Pro v3',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   12
    },
    {
        name: 'Jinx',
        mkr:  {name: 'Warped Circuits'},
        hp:   4
    },
    {
        name: 'Rangoon',
        mkr:  {name: 'Big T Music'},
        hp:   12
    },
    {
        name: 'nw2s::b',
        mkr:  {name: 'nw2s'},
        hp:   40
    },
    {
        name: 'Alex & June V2: Red',
        mkr:  {name: 'Razmasynth'},
        hp:   6
    },
    {
        name: 'Algebra',
        mkr:  {name: 'Reckless Experimentation Audio'},
        hp:   16
    },
    {
        name: 'Moog Minitaur',
        mkr:  {name: 'Million Machine March'},
        hp:   43
    },
    {
        name: 'Expander E-1 for WF-1',
        mkr:  {name: 'DPW Design'},
        hp:   2
    },
    {
        name: 'Mogue',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'Lattice',
        mkr:  {name: 'Tenderfoot Electronics'},
        hp:   6
    },
    {
        name: 'ADDAC221',
        mkr:  {name: 'ADDAC System'},
        hp:   7
    },
    {
        name: 'Mantic Euro Flex',
        mkr:  {name: 'WMD'},
        hp:   8
    },
    {
        name: 'Tapographic Delay - Black Panel',
        mkr:  {name: '4ms Company'},
        hp:   18
    },
    {
        name: 'Noiro-ze',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   10
    },
    {
        name: 'Iñaki',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'ATOM (white panel)',
        mkr:  {name: 'Antumbra'},
        hp:   6
    },
    {
        name: 'RS-270',
        mkr:  {name: 'Analogue Systems'},
        hp:   12
    },
    {
        name: 'GMS-632EU USB/MIDI/CV Interface',
        mkr:  {name: 'Grove Audio'},
        hp:   6
    },
    {
        name: 'WK3 MIDI Thru',
        mkr:  {name: 'LPZW.modules'},
        hp:   2
    },
    {
        name: 'OSC-1',
        mkr:  {name: 'Reckless Experimentation Audio'},
        hp:   4
    },
    {
        name: 'Quark',
        mkr:  {name: 'End Times Modular'},
        hp:   6
    },
    {
        name: 'Bartos Flur II',
        mkr:  {name: 'Frequency Central'},
        hp:   12
    },
    {
        name: 'knit rider (control only)',
        mkr:  {name: 'Bastl Instruments'},
        hp:   13
    },
    {
        name: 'µDJV',
        mkr:  {name: 'Codex Modulex'},
        hp:   10
    },
    {
        name: 'Make Noise X-Pan (Grayscale aluminum panel)',
        mkr:  {name: 'Grayscale'},
        hp:   null
    },
    {
        name: 'Kala Goañv',
        mkr:  {name: 'TouellSkouarn'},
        hp:   8
    },
    {
        name: 'NOZORI 84',
        mkr:  {name: 'Nozoïd'},
        hp:   12
    },
    {
        name: 'Nandamonium - Eurorack',
        mkr:  {name: 'Synthrotek'},
        hp:   38
    },
    {
        name: 'Selecta',
        mkr:  {name: 'Tesseract Modular'},
        hp:   8
    },
    {
        name: 'Seismograf SD',
        mkr:  {name: 'Frequency Central'},
        hp:   4
    },
    {
        name: 'Raverb',
        mkr:  {name: 'Arcaico'},
        hp:   10
    },
    {
        name: 'ATOM (plain panel)',
        mkr:  {name: 'Antumbra'},
        hp:   18
    },
    {
        name: 'TABØR - white mirror panel',
        mkr:  {name: 'Jolin Lab'},
        hp:   12
    },
    {
        name: 'Ex 2hp - Black Panel',
        mkr:  {name: 'Plum Audio'},
        hp:   2
    },
    {
        name: 'Saevitum',
        mkr:  {name: 'Abyss Devices'},
        hp:   16
    },
    {
        name: 'Prizma (Modest Panel)',
        mkr:  {name: 'Doboz'},
        hp:   6
    },
    {
        name: 'Clock Divider',
        mkr:  {name: 'PMFoundations'},
        hp:   4
    },
    {
        name: 'LFO v2 (matte black)',
        mkr:  {name: 'Noise Reap'},
        hp:   4
    },
    {
        name: 'Spasm',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'ToolBox',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'TONESTAR 2600 FOLKTEK\'d',
        mkr:  {name: 'Studio Electronics'},
        hp:   null
    },
    {
        name: 'AR2',
        mkr:  {name: 'York Modular'},
        hp:   8
    },
    {
        name: 'Via SYNC',
        mkr:  {name: 'Starling'},
        hp:   12
    },
    {
        name: 'Discrete VC Stereo Mixer',
        mkr:  {name: 'L-1'},
        hp:   22
    },
    {
        name: 'Sewastopol II (black panel)',
        mkr:  {name: 'Xaoc Devices'},
        hp:   10
    },
    {
        name: 'µTune - silver edition',
        mkr:  {name: 'Tubbutec'},
        hp:   8
    },
    {
        name: 'Quaid Megaslope - Grey',
        mkr:  {name: 'ALM Busy Circuits'},
        hp:   19
    },
    {
        name: 'SVF(Soulless)',
        mkr:  {name: 'Z?ob'},
        hp:   4
    },
    {
        name: 'D.O.MIXX',
        mkr:  {name: 'Blood Cells Audio'},
        hp:   22
    },
    {
        name: 'Ciobra',
        mkr:  {name: 'Barullo'},
        hp:   8
    },
    {
        name: 'ADSR312',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'pinhl 2020',
        mkr:  {name: 'Tenderfoot Electronics'},
        hp:   11
    },
    {
        name: 'VCO 204',
        mkr:  {name: 'EMW'},
        hp:   8
    },
    {
        name: 'M-611 3ch stereo slider mixer',
        mkr:  {name: 'Ladik'},
        hp:   8
    },
    {
        name: 'E-110 5-Band EQ Alternative Black Panel',
        mkr:  {name: 'Ladik'},
        hp:   2
    },
    {
        name: 'Krach aus Strom',
        mkr:  {name: 'ST Modular'},
        hp:   14
    },
    {
        name: 'µLements',
        mkr:  {name: 'Codex Modulex'},
        hp:   18
    },
    {
        name: 'Dirty Murals',
        mkr:  {name: 'Recovery Effects and Devices'},
        hp:   12
    },
    {
        name: '921 ABB',
        mkr:  {name: 'Aion Modular'},
        hp:   20
    },
    {
        name: 'Beat Freq',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'Seismograf BD',
        mkr:  {name: 'Frequency Central'},
        hp:   4
    },
    {
        name: 'BaxandallEQ',
        mkr:  {name: 'Konstant Lab'},
        hp:   4
    },
    {
        name: 'A+ Astronaut Modular',
        mkr:  {name: 'Shift Line'},
        hp:   12
    },
    {
        name: 'Neuron Difference Rectifier',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'Mi-Ko-C',
        mkr:  {name: 'X-Fade Modular'},
        hp:   8
    },
    {
        name: 'Pontius',
        mkr:  {name: 'Bard'},
        hp:   5
    },
    {
        name: 'AVS-ADSR-1',
        mkr:  {name: 'AvonSynth'},
        hp:   6
    },
    {
        name: 'Switched Multiple',
        mkr:  {name: 'ST Modular'},
        hp:   4
    },
    {
        name: 'Nozori single expansion board',
        mkr:  {name: 'Nozoïd'},
        hp:   null
    },
    {
        name: 'FSR-4B',
        mkr:  {name: 'Synthwerks'},
        hp:   6
    },
    {
        name: 'ES14 - Voltage Processor',
        mkr:  {name: 'Elby Designs'},
        hp:   10
    },
    {
        name: 'Relay Perc',
        mkr:  {name: 'Gieskes'},
        hp:   8
    },
    {
        name: 'Clap Snare',
        mkr:  {name: 'Reckless Experimentation Audio'},
        hp:   4
    },
    {
        name: '6080 VCO',
        mkr:  {name: 'PMFoundations'},
        hp:   10
    },
    {
        name: 'Quadrangle white version',
        mkr:  {name: 'Synthrotek'},
        hp:   20
    },
    {
        name: 'ADSR-1',
        mkr:  {name: 'Skull & Circuits'},
        hp:   8
    },
    {
        name: 'SEQ8.2',
        mkr:  {name: 'York Modular'},
        hp:   6
    },
    {
        name: 'BLM 10 Stage Steiner VCF',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   12
    },
    {
        name: 'Splosh',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   12
    },
    {
        name: 'Seju',
        mkr:  {name: 'Bizarre Jezabel'},
        hp:   10
    },
    {
        name: 'Blank Panel V2 new design',
        mkr:  {name: 'omsonic'},
        hp:   8
    },
    {
        name: 'RS-130',
        mkr:  {name: 'Analogue Systems'},
        hp:   24
    },
    {
        name: 'm3 Power Indicator',
        mkr:  {name: 'Trogotronic'},
        hp:   2
    },
    {
        name: 'ADDAC301C',
        mkr:  {name: 'ADDAC System'},
        hp:   4
    },
    {
        name: 'p0wr',
        mkr:  {name: 'vpme.de'},
        hp:   4
    },
    {
        name: 'Alias DVCO',
        mkr:  {name: 'EMW'},
        hp:   8
    },
    {
        name: 'MiniMod DH-ADSR Envelope (Silver Panel Version)',
        mkr:  {name: 'AJH Synth'},
        hp:   10
    },
    {
        name: '2Q12 VCF',
        mkr:  {name: 'PMFoundations'},
        hp:   6
    },
    {
        name: 'Bad Comrade V2',
        mkr:  {name: 'Recovery Effects and Devices'},
        hp:   14
    },
    {
        name: 'Paths - Grayscale panel',
        mkr:  {name: 'RYO'},
        hp:   8
    },
    {
        name: 'Thereminator',
        mkr:  {name: 'WaveLicker'},
        hp:   4
    },
    {
        name: 'Cyllene',
        mkr:  {name: 'ST Modular'},
        hp:   12
    },
    {
        name: 'Cutting Room Floor v2 (Black)',
        mkr:  {name: 'Recovery Effects and Devices'},
        hp:   14
    },
    {
        name: 'Maelstrom',
        mkr:  {name: 'Sognage'},
        hp:   10
    },
    {
        name: '1047E Arp Multimode Filter',
        mkr:  {name: 'CMS'},
        hp:   14
    },
    {
        name: 'Mutant Bassdrum',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   null
    },
    {
        name: 'B1 Kick Drum / Bass Voice',
        mkr:  {name: 'Weston Precision Audio'},
        hp:   18
    },
    {
        name: 'RAVEN - Natural Anodized',
        mkr:  {name: 'birdkids'},
        hp:   42
    },
    {
        name: 'Roam (Gold)',
        mkr:  {name: 'Folktek'},
        hp:   null
    },
    {
        name: 'SUM SUM',
        mkr:  {name: 'ACL'},
        hp:   6
    },
    {
        name: 'MACA Filter',
        mkr:  {name: 'LA 67'},
        hp:   6
    },
    {
        name: 'Orgone Drum Cloudbusting 2',
        mkr:  {name: 'Error Instruments'},
        hp:   18
    },
    {
        name: 'U-030',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'ES18 - VCM3',
        mkr:  {name: 'Elby Designs'},
        hp:   7
    },
    {
        name: 'VATclap',
        mkr:  {name: 'Falafular'},
        hp:   4
    },
    {
        name: 'School Bus Theme Braids',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   10
    },
    {
        name: '0 Sugar',
        mkr:  {name: 'Dovemans'},
        hp:   8
    },
    {
        name: 'RectangularThing',
        mkr:  {name: 'Tinrs'},
        hp:   36
    },
    {
        name: 'PedalPal',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'WaveSwarm (Silver Panel)',
        mkr:  {name: 'AJH Synth'},
        hp:   14
    },
    {
        name: 'UTL-1E',
        mkr:  {name: 'Low-Gain Electronics'},
        hp:   6
    },
    {
        name: 'Sirius\' Veil',
        mkr:  {name: 'VOID Modular'},
        hp:   14
    },
    {
        name: 'Voices (Gold)',
        mkr:  {name: 'Folktek'},
        hp:   null
    },
    {
        name: 'RS-450',
        mkr:  {name: 'Analogue Systems'},
        hp:   36
    },
    {
        name: 'ADDAC212 EG Att. Pack',
        mkr:  {name: 'ADDAC System'},
        hp:   6
    },
    {
        name: 'Hi-Tom Lo-Tom',
        mkr:  {name: 'Reckless Experimentation Audio'},
        hp:   4
    },
    {
        name: 'tVCF-Extension',
        mkr:  {name: 'Vermona'},
        hp:   10
    },
    {
        name: 'Feed V2',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: '2HP2CV USB to CV Adapter (Black Panel)',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   10
    },
    {
        name: 'JP4 Chorus',
        mkr:  {name: 'G-Storm Electro'},
        hp:   4
    },
    {
        name: 'Technicolor',
        mkr:  {name: 'LA Circuits'},
        hp:   14
    },
    {
        name: 'Dual Multiple',
        mkr:  {name: 'FPB'},
        hp:   2
    },
    {
        name: 'Sloth Chaos',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   6
    },
    {
        name: 'AM8105 VCF & VCA',
        mkr:  {name: 'AMSynths'},
        hp:   14
    },
    {
        name: 'Lodi MULT',
        mkr:  {name: 'North Coast Modular Collective'},
        hp:   3
    },
    {
        name: 'VCADSR',
        mkr:  {name: 'Befaco'},
        hp:   null
    },
    {
        name: 'Clocky (DIY)',
        mkr:  {name: 'SoundForce'},
        hp:   9
    },
    {
        name: 'VU003',
        mkr:  {name: 'Syntonie'},
        hp:   null
    },
    {
        name: 'M-171 pannable mixer',
        mkr:  {name: 'Ladik'},
        hp:   12
    },
    {
        name: 'EURO DSO',
        mkr:  {name: 'FPB'},
        hp:   14
    },
    {
        name: 'Equinox ADSR',
        mkr:  {name: 'Equinox'},
        hp:   8
    },
    {
        name: 'Sinope',
        mkr:  {name: 'IO Instruments'},
        hp:   16
    },
    {
        name: 'Lorem ipsum 8 (black)',
        mkr:  {name: 'Noise Engineering'},
        hp:   null
    },
    {
        name: 'Modular Solo BLACK',
        mkr:  {name: 'Kenton'},
        hp:   10
    },
    {
        name: 'Lizard',
        mkr:  {name: 'Vinicius Electrik'},
        hp:   20
    },
    {
        name: 'M+ Blank',
        mkr:  {name: 'VOID Modular'},
        hp:   8
    },
    {
        name: 'EuroScope EXPANDER',
        mkr:  {name: 'Plum Audio'},
        hp:   2
    },
    {
        name: 'SLOPES',
        mkr:  {name: 'Noise Reap'},
        hp:   12
    },
    {
        name: '1070 Mixer',
        mkr:  {name: 'CMS'},
        hp:   14
    },
    {
        name: 'EXP-1',
        mkr:  {name: 'LeafAudio'},
        hp:   10
    },
    {
        name: 'Trash Drum v2',
        mkr:  {name: 'Error Instruments'},
        hp:   6
    },
    {
        name: 'Otto Passive Mono',
        mkr:  {name: 'Manikk'},
        hp:   2
    },
    {
        name: 'AGOGO - white mirror panel',
        mkr:  {name: 'Jolin Lab'},
        hp:   6
    },
    {
        name: '808 Kick DIY',
        mkr:  {name: 'SoundForce'},
        hp:   8
    },
    {
        name: 'DJ Thomas White Dual LPG',
        mkr:  {name: 'synthCube'},
        hp:   12
    },
    {
        name: 'Moonwalker',
        mkr:  {name: 'Metabolic Devices'},
        hp:   10
    },
    {
        name: 'Dust of Time',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   16
    },
    {
        name: 'AVS-MIDI-1',
        mkr:  {name: 'AvonSynth'},
        hp:   10
    },
    {
        name: 'Triple Sloth Chaos',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'SYS-100 VCF',
        mkr:  {name: 'Pharmasonic'},
        hp:   10
    },
    {
        name: 'Equinox LFO',
        mkr:  {name: 'Equinox'},
        hp:   8
    },
    {
        name: 'HVM',
        mkr:  {name: 'Oakley'},
        hp:   8
    },
    {
        name: 'Multimix',
        mkr:  {name: 'Oakley'},
        hp:   6
    },
    {
        name: 'flip-sides',
        mkr:  {name: 'eurorack essentials'},
        hp:   3
    },
    {
        name: 'r-112 Random trigs/gates',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'Swiss Army Mixer V2',
        mkr:  {name: 'Noise Reap'},
        hp:   8
    },
    {
        name: 'BLM Assist Percussion Utility (APU) MK2',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   12
    },
    {
        name: 'E-251 Stereo Slider EQ',
        mkr:  {name: 'Ladik'},
        hp:   16
    },
    {
        name: 'TP8',
        mkr:  {name: 'XODES'},
        hp:   6
    },
    {
        name: 'Video Mult',
        mkr:  {name: 'Visible Signals'},
        hp:   4
    },
    {
        name: 'uTides 2',
        mkr:  {name: 'Warped Circuits'},
        hp:   8
    },
    {
        name: 'uPeaks (Black)',
        mkr:  {name: 'CalSynth'},
        hp:   4
    },
    {
        name: 'ADDAC204 VC CV Mapping',
        mkr:  {name: 'ADDAC System'},
        hp:   6
    },
    {
        name: 'ES16 - Extended ADSR',
        mkr:  {name: 'Elby Designs'},
        hp:   15
    },
    {
        name: 'Super Sloth (Clarke Robinson panel)',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   2018
    },
    {
        name: 'ALAK',
        mkr:  {name: 'Gibbon Digital'},
        hp:   14
    },
    {
        name: 'Kaiwa',
        mkr:  {name: 'Polaxis'},
        hp:   16
    },
    {
        name: 'Waveform Animator',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   6
    },
    {
        name: 'Solar Theremin duo',
        mkr:  {name: 'Error Instruments'},
        hp:   6
    },
    {
        name: 'G????-3 aluminium ??',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: 'MARLYNS BANG !',
        mkr:  {name: 'Error Instruments'},
        hp:   6
    },
    {
        name: 'Dual Borg - Magpie white panel',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   16
    },
    {
        name: '3x ATT (white panel)',
        mkr:  {name: 'ph modular'},
        hp:   4
    },
    {
        name: '1u to 3u Adapter (Intellijel)',
        mkr:  {name: 'Abyss Devices'},
        hp:   12
    },
    {
        name: 'LB5 - 3U',
        mkr:  {name: 'XODES'},
        hp:   6
    },
    {
        name: 'AGOGO - black mirror panel',
        mkr:  {name: 'Jolin Lab'},
        hp:   6
    },
    {
        name: 'S-909',
        mkr:  {name: 'SoundForce'},
        hp:   6
    },
    {
        name: 'Bog',
        mkr:  {name: 'After Later Audio'},
        hp:   4
    },
    {
        name: 'SEQ-UFD',
        mkr:  {name: 'CaviSynth'},
        hp:   4
    },
    {
        name: 'MRG LPF/a',
        mkr:  {name: 'MRG Synthesizers'},
        hp:   4
    },
    {
        name: 'Barton Voltage to Rhythm Converter',
        mkr:  {name: 'synthCube'},
        hp:   20
    },
    {
        name: 'SP-1P (ALT)',
        mkr:  {name: 'Synthwerks'},
        hp:   8
    },
    {
        name: 'Raw spring . v2 .eurorack',
        mkr:  {name: 'Error Instruments'},
        hp:   10
    },
    {
        name: 'Poly Mix',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   12
    },
    {
        name: 'Atten-V',
        mkr:  {name: 'PMFoundations'},
        hp:   6
    },
    {
        name: 'Model 156V CV Processor',
        mkr:  {name: 'Catalyst Audio'},
        hp:   14
    },
    {
        name: 'Little Nerd (Magpie panel)',
        mkr:  {name: 'Bastl Instruments'},
        hp:   6
    },
    {
        name: 'HG-30',
        mkr:  {name: 'Audiospektri'},
        hp:   32
    },
    {
        name: 'raw spring -- neo lime -',
        mkr:  {name: 'Error Instruments'},
        hp:   3
    },
    {
        name: 'zLFO',
        mkr:  {name: 'Motovilo'},
        hp:   8
    },
    {
        name: 'Subway',
        mkr:  {name: 'CaviSynth'},
        hp:   8
    },
    {
        name: 'SAR',
        mkr:  {name: 'Takaab'},
        hp:   6
    },
    {
        name: '1055 Modulator / Mixer / Panner',
        mkr:  {name: 'CMS'},
        hp:   14
    },
    {
        name: 'RS-60N',
        mkr:  {name: 'Analogue Systems'},
        hp:   12
    },
    {
        name: 'RS-180N',
        mkr:  {name: 'Analogue Systems'},
        hp:   12
    },
    {
        name: 'SYS-700 VCA 704',
        mkr:  {name: 'Pharmasonic'},
        hp:   12
    },
    {
        name: 'RD-TR',
        mkr:  {name: 'Behringer'},
        hp:   4
    },
    {
        name: 'Bad Idea #1800-CALL-YER-MUM',
        mkr:  {name: 'Møffenzeef Mødular'},
        hp:   12
    },
    {
        name: 'BLM Resonator',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   12
    },
    {
        name: 'scanner (black panel)',
        mkr:  {name: 'brownshoesonly'},
        hp:   4
    },
    {
        name: 'POLY EG/LFO',
        mkr:  {name: 'Mazzatron'},
        hp:   6
    },
    {
        name: 'Midi to CV',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   10
    },
    {
        name: '????-3 black',
        mkr:  {name: 'Paratek'},
        hp:   4
    },
    {
        name: 'SCMBO - Black Panel',
        mkr:  {name: '4ms Company'},
        hp:   8
    },
    {
        name: 'RS-380N (Dual Bus)',
        mkr:  {name: 'Analogue Systems'},
        hp:   12
    },
    {
        name: 'CATCH VCF-A',
        mkr:  {name: 'ReBach'},
        hp:   8
    },
    {
        name: 'Dual Control Voltage Processor Model 156',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   14
    },
    {
        name: 'AVS-VCA-1',
        mkr:  {name: 'AvonSynth'},
        hp:   10
    },
    {
        name: 'Cells - expander for Lattice',
        mkr:  {name: 'Tenderfoot Electronics'},
        hp:   16
    },
    {
        name: 'State Machine',
        mkr:  {name: 'PMFoundations'},
        hp:   10
    },
    {
        name: 'Asteroid Snare Drum Black',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   16
    },
    {
        name: '???-1?',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: 'Co-Captains',
        mkr:  {name: 'Noise Reap'},
        hp:   20
    },
    {
        name: 'dualswitch',
        mkr:  {name: 'eurorack essentials'},
        hp:   3
    },
    {
        name: '??????-6 Black',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: 'Active patch',
        mkr:  {name: 'EMW'},
        hp:   20
    },
    {
        name: 'Capsule Titan Modules',
        mkr:  {name: 'Eowave'},
        hp:   6
    },
    {
        name: 'mixer cp3',
        mkr:  {name: 'Aion Modular'},
        hp:   16
    },
    {
        name: 'Sequential Voltage 16',
        mkr:  {name: 'EMW'},
        hp:   14
    },
    {
        name: 'euEM2',
        mkr:  {name: 'Northern Light Modular'},
        hp:   18
    },
    {
        name: 'SVF-1',
        mkr:  {name: 'Tenderfoot Electronics'},
        hp:   8
    },
    {
        name: 'LFO',
        mkr:  {name: 'Stem Modular'},
        hp:   6
    },
    {
        name: 'Can I kick it?',
        mkr:  {name: 'Skull & Circuits'},
        hp:   12
    },
    {
        name: 'VCF/VCA 6 Grey',
        mkr:  {name: 'SoundForce'},
        hp:   18
    },
    {
        name: 'Cascade (Silver)',
        mkr:  {name: 'Qu-Bit Electronix'},
        hp:   10
    },
    {
        name: 'Skorn da Bask - Black panel',
        mkr:  {name: 'TouellSkouarn'},
        hp:   16
    },
    {
        name: 'ES84 - Peak & Trough Detector',
        mkr:  {name: 'Elby Designs'},
        hp:   14
    },
    {
        name: 'ADSR 1',
        mkr:  {name: 'X-Fade Modular'},
        hp:   null
    },
    {
        name: '2HP2CV USB to CV Adapter',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   22
    },
    {
        name: 'ADDAC402B Euclidean Midi I/O Expansion',
        mkr:  {name: 'ADDAC System'},
        hp:   null
    },
    {
        name: 'Slew',
        mkr:  {name: 'PMFoundations'},
        hp:   4
    },
    {
        name: 'LPF-3320',
        mkr:  {name: 'Takaab'},
        hp:   4
    },
    {
        name: 'Noizes',
        mkr:  {name: 'D&D Modules'},
        hp:   6
    },
    {
        name: 'Dual Reverberator MODEL 990',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   14
    },
    {
        name: 'FUZZ-1',
        mkr:  {name: 'Skull & Circuits'},
        hp:   4
    },
    {
        name: 'M-221 MIDI to clock synchronizer',
        mkr:  {name: 'Ladik'},
        hp:   8
    },
    {
        name: 'SLIDE',
        mkr:  {name: 'Mazzatron'},
        hp:   8
    },
    {
        name: 'BST',
        mkr:  {name: 'York Modular'},
        hp:   2
    },
    {
        name: 'matrix mixer',
        mkr:  {name: '256klabs'},
        hp:   20
    },
    {
        name: 'Quad AAF (BLACK)',
        mkr:  {name: 'WMD'},
        hp:   4
    },
    {
        name: 'Sol (black panel)',
        mkr:  {name: 'Winterbloom'},
        hp:   8
    },
    {
        name: 'Dual Distrib',
        mkr:  {name: 'Visible Signals'},
        hp:   4
    },
    {
        name: 'RGB Matrix Input',
        mkr:  {name: 'Visible Signals'},
        hp:   4
    },
    {
        name: 'uT_u',
        mkr:  {name: 'After Later Audio'},
        hp:   8
    },
    {
        name: 'AM8005 Diode Multi Mode VCF',
        mkr:  {name: 'AMSynths'},
        hp:   16
    },
    {
        name: 'Gatling Clock',
        mkr:  {name: 'Analog Ordnance'},
        hp:   12
    },
    {
        name: 'ASM316 - Dual VCA',
        mkr:  {name: 'Elby Designs'},
        hp:   12
    },
    {
        name: '8 Bit Cipher - Magpie white panel',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   10
    },
    {
        name: 'GIVE',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'rLPF',
        mkr:  {name: 'York Modular'},
        hp:   8
    },
    {
        name: 'Delay No More',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'IPS2',
        mkr:  {name: 'Seismic Industries'},
        hp:   2
    },
    {
        name: 'Echo Rockit',
        mkr:  {name: 'MFOS'},
        hp:   26
    },
    {
        name: 'AVS-VCF-1',
        mkr:  {name: 'AvonSynth'},
        hp:   10
    },
    {
        name: 'Buffers',
        mkr:  {name: 'Plum Audio'},
        hp:   4
    },
    {
        name: 'm/15 Inlet Power Module',
        mkr:  {name: 'Trogotronic'},
        hp:   11
    },
    {
        name: 'Transistor-82',
        mkr:  {name: 'G-Storm Electro'},
        hp:   14
    },
    {
        name: 'sequencemix',
        mkr:  {name: 'Hinton Instruments'},
        hp:   26
    },
    {
        name: 'Pentode VCA',
        mkr:  {name: 'Purrtronics'},
        hp:   10
    },
    {
        name: 'Triple Vactrol Resonators XS (Eurorack DIY)',
        mkr:  {name: 'Fonitronik'},
        hp:   12
    },
    {
        name: 'PanMix',
        mkr:  {name: 'Flame'},
        hp:   6
    },
    {
        name: 'AVR-VCO',
        mkr:  {name: 'York Modular'},
        hp:   3
    },
    {
        name: 'RAW DRUM',
        mkr:  {name: 'Error Instruments'},
        hp:   6
    },
    {
        name: 'KS-20 Filter (Vintagelavalamp Black Panel)',
        mkr:  {name: 'Kassutronics'},
        hp:   null
    },
    {
        name: '????-6 black blue buttons',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: '24dB Cascade VCF',
        mkr:  {name: 'Aqa Elektrix'},
        hp:   14
    },
    {
        name: 'MM3461B Steel Falcon VCF SE',
        mkr:  {name: 'Metro Modular'},
        hp:   15
    },
    {
        name: 'Random Pulse 4x',
        mkr:  {name: 'EMW'},
        hp:   6
    },
    {
        name: 'Acoustic Echoes gold',
        mkr:  {name: 'Error Instruments'},
        hp:   10
    },
    {
        name: 'Attenuator',
        mkr:  {name: 'PMFoundations'},
        hp:   6
    },
    {
        name: 'Tropical Noise (white edition)',
        mkr:  {name: 'Error Instruments'},
        hp:   11
    },
    {
        name: 'SYS-100 ADSR',
        mkr:  {name: 'Pharmasonic'},
        hp:   6
    },
    {
        name: 'rBPF2',
        mkr:  {name: 'York Modular'},
        hp:   2
    },
    {
        name: 'Timing Pulse Generator MODEL 140',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   14
    },
    {
        name: 'ATT3',
        mkr:  {name: 'JPSynth'},
        hp:   4
    },
    {
        name: 'NEW ! cloud busting wood',
        mkr:  {name: 'Error Instruments'},
        hp:   18
    },
    {
        name: 'SYS-700 VCF 703F',
        mkr:  {name: 'Pharmasonic'},
        hp:   16
    },
    {
        name: 'KEYS-1 Keyboard Quantizer',
        mkr:  {name: 'Mazzatron'},
        hp:   8
    },
    {
        name: 'Mod+',
        mkr:  {name: 'PMFoundations'},
        hp:   6
    },
    {
        name: '3x ATT (green panel)',
        mkr:  {name: 'ph modular'},
        hp:   4
    },
    {
        name: 'MS-1 Expander',
        mkr:  {name: 'Behringer'},
        hp:   8
    },
    {
        name: 'F-110 Alternative Black Panel',
        mkr:  {name: 'Ladik'},
        hp:   6
    },
    {
        name: 'r2rawr',
        mkr:  {name: 'Omiindustriies'},
        hp:   11
    },
    {
        name: 'Continuum Phaser II (silver)',
        mkr:  {name: 'Frequency Central'},
        hp:   4
    },
    {
        name: 'ADDAC807C+',
        mkr:  {name: 'ADDAC System'},
        hp:   2
    },
    {
        name: 'MRG LFOs',
        mkr:  {name: 'MRG Synthesizers'},
        hp:   4
    },
    {
        name: 'DALPG',
        mkr:  {name: 'kNoB technology'},
        hp:   2
    },
    {
        name: 'TEO',
        mkr:  {name: 'Tesseract Modular'},
        hp:   4
    },
    {
        name: 'MultiLFO MK2',
        mkr:  {name: 'VBrazil Systems'},
        hp:   20
    },
    {
        name: 'MULTIBAND DISTORTION PROCESSER, C68 EURO PANEL',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'XTr3tone',
        mkr:  {name: 'Qosmo Modular'},
        hp:   4
    },
    {
        name: 'Entropy Cannon',
        mkr:  {name: 'VOID Modular'},
        hp:   10
    },
    {
        name: 'M-146 6-ch Mixer',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: '???? black red buchla knobs',
        mkr:  {name: 'Paratek'},
        hp:   4
    },
    {
        name: '6 X Gate to Trigger Converter',
        mkr:  {name: 'EMW'},
        hp:   6
    },
    {
        name: '8-CH Mixer',
        mkr:  {name: 'EMW'},
        hp:   20
    },
    {
        name: 'Tomo Muji V2',
        mkr:  {name: 'Error Instruments'},
        hp:   12
    },
    {
        name: 'Attenuverter',
        mkr:  {name: 'Schenktronics'},
        hp:   6
    },
    {
        name: 'Guitar Input (Oscillosaurus Panel)',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   null
    },
    {
        name: 'Brain Custard - Magpie Modular Black Panel',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'BLM Cyllene VCLFO',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   null
    },
    {
        name: 'Sharp Cutoff Filter MODEL 191',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   28
    },
    {
        name: 'RCVS-4',
        mkr:  {name: 'ACL'},
        hp:   6
    },
    {
        name: 'ROTLFO',
        mkr:  {name: 'Mobula Mobular'},
        hp:   6
    },
    {
        name: '905 Reverberation Unit',
        mkr:  {name: 'Aion Modular'},
        hp:   12
    },
    {
        name: 'MKC8 ?? black',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: 'Clock Divider (CD)',
        mkr:  {name: 'Wavefonix'},
        hp:   6
    },
    {
        name: '4x4 Buffered Multiple (BM)',
        mkr:  {name: 'Wavefonix'},
        hp:   7
    },
    {
        name: 'Pathogen',
        mkr:  {name: 'Beast-Tek'},
        hp:   null
    },
    {
        name: 'VCDLFO',
        mkr:  {name: 'Wavefonix'},
        hp:   8
    },
    {
        name: 'Animator',
        mkr:  {name: 'Ladik'},
        hp:   4
    },
    {
        name: 'MIDI clock to Pulse',
        mkr:  {name: 'EMW'},
        hp:   12
    },
    {
        name: 'VXP1',
        mkr:  {name: 'Synovatron'},
        hp:   14
    },
    {
        name: 'Phones',
        mkr:  {name: 'L-1'},
        hp:   8
    },
    {
        name: 'ASM321 - Basic VCO',
        mkr:  {name: 'Elby Designs'},
        hp:   17
    },
    {
        name: 'DIN SYNC',
        mkr:  {name: 'Malekko Heavy Industry'},
        hp:   null
    },
    {
        name: 'Bindubba - Magpie white panel',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   18
    },
    {
        name: '3-Channel Stereo Panning Mixer',
        mkr:  {name: 'Wavefonix'},
        hp:   6
    },
    {
        name: 'Poly-8 Voltage-Controlled Oscillator (VCO)',
        mkr:  {name: 'Wavefonix'},
        hp:   6
    },
    {
        name: 'µcls',
        mkr:  {name: 'Tenderfoot Electronics'},
        hp:   18
    },
    {
        name: 'TURN',
        mkr:  {name: 'Synthrotek'},
        hp:   4
    },
    {
        name: 'Multiwaves',
        mkr:  {name: 'Vinicius Electrik'},
        hp:   22
    },
    {
        name: 'SYS-700 Amp./Env. Foll./Integrator 707',
        mkr:  {name: 'Pharmasonic'},
        hp:   14
    },
    {
        name: 'Automix',
        mkr:  {name: 'Flame'},
        hp:   6
    },
    {
        name: 'POKIT',
        mkr:  {name: 'Grayscale'},
        hp:   42
    },
    {
        name: 'Bad Idea #18214',
        mkr:  {name: 'Møffenzeef Mødular'},
        hp:   14
    },
    {
        name: 'VOLTAGE RUNNER',
        mkr:  {name: 'Ginko Synthese'},
        hp:   12
    },
    {
        name: 'Multiple dual channels WR',
        mkr:  {name: 'ph modular'},
        hp:   6
    },
    {
        name: 'Buffered multiple 1 to 3 (x4 ... and more!) W',
        mkr:  {name: 'ph modular'},
        hp:   6
    },
    {
        name: 'Ring Modulator (RM)',
        mkr:  {name: 'Wavefonix'},
        hp:   5
    },
    {
        name: 'Dual Sine Sawtooth Generator Model 158 REV2.0 RED',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   14
    },
    {
        name: 'VC-LFO',
        mkr:  {name: 'Orpho'},
        hp:   6
    },
    {
        name: 'ORX',
        mkr:  {name: 'Adventure Audio'},
        hp:   2
    },
    {
        name: 'K-2 Decoder',
        mkr:  {name: 'Behringer'},
        hp:   80
    },
    {
        name: '4023 VCF Aluminum',
        mkr:  {name: 'G-Storm Electro'},
        hp:   8
    },
    {
        name: 'RS-110N',
        mkr:  {name: 'Analogue Systems'},
        hp:   18
    },
    {
        name: 'nw2s::o16 (unbalanced)',
        mkr:  {name: 'nw2s'},
        hp:   10
    },
    {
        name: '3340 Voltage-Controlled Oscillator (VCO) Classic Edition',
        mkr:  {name: 'Wavefonix'},
        hp:   13
    },
    {
        name: 'PHRSR',
        mkr:  {name: 'Super Synthesis'},
        hp:   6
    },
    {
        name: 'SNOW',
        mkr:  {name: 'Reverse Landfill'},
        hp:   8
    },
    {
        name: 'B-230 Curious Goat (silver)',
        mkr:  {name: 'Ladik'},
        hp:   8
    },
    {
        name: 'XMix',
        mkr:  {name: 'Qosmo Modular'},
        hp:   4
    },
    {
        name: 'Gate Delay',
        mkr:  {name: 'EMW'},
        hp:   6
    },
    {
        name: 'TZ-VCO',
        mkr:  {name: 'Klangbau Köln'},
        hp:   null
    },
    {
        name: '??????-6 Aluminium',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: 'Jacks',
        mkr:  {name: 'Synovatron'},
        hp:   5
    },
    {
        name: 'Suprematist',
        mkr:  {name: 'LA Circuits'},
        hp:   12
    },
    {
        name: 'IF101 - 2Q/4Q',
        mkr:  {name: 'Elby Designs'},
        hp:   10
    },
    {
        name: 'CGS93 (A-H) Trunk',
        mkr:  {name: 'Elby Designs'},
        hp:   4
    },
    {
        name: 'ES30 Stereo Panner',
        mkr:  {name: 'Elby Designs'},
        hp:   12
    },
    {
        name: 'Heuristic I/O MIDI Expansion',
        mkr:  {name: 'ADDAC System'},
        hp:   6
    },
    {
        name: 'PRE AMP',
        mkr:  {name: 'trouby modular'},
        hp:   6
    },
    {
        name: 'Koe v4.0',
        mkr:  {name: 'Atomosynth'},
        hp:   42
    },
    {
        name: 'SEQUENCER 101',
        mkr:  {name: 'EMW'},
        hp:   16
    },
    {
        name: 'XDyna',
        mkr:  {name: 'Qosmo Modular'},
        hp:   4
    },
    {
        name: 'victorians , sonic lulaby passive',
        mkr:  {name: 'Error Instruments'},
        hp:   8
    },
    {
        name: 'Format',
        mkr:  {name: 'Found Sound'},
        hp:   12
    },
    {
        name: 'Matrix mix',
        mkr:  {name: 'Hinton Instruments'},
        hp:   56
    },
    {
        name: 'Oscilloscape',
        mkr:  {name: 'Recovery Effects and Devices'},
        hp:   8
    },
    {
        name: 'CATCH ADSR-A',
        mkr:  {name: 'ReBach'},
        hp:   8
    },
    {
        name: 'Dual Voltage Controlled Gate Model 110',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   14
    },
    {
        name: 'SPEEDBUMP v2.1',
        mkr:  {name: 'Error Instruments'},
        hp:   10
    },
    {
        name: 'CATCH LFO-B',
        mkr:  {name: 'ReBach'},
        hp:   6
    },
    {
        name: 'YM3812 V3',
        mkr:  {name: 'Reckless Experimentation Audio'},
        hp:   34
    },
    {
        name: 'Noise Toast',
        mkr:  {name: 'MFOS'},
        hp:   35
    },
    {
        name: 'Two Sides',
        mkr:  {name: 'ST Modular'},
        hp:   null
    },
    {
        name: 'SSI2144 VCF',
        mkr:  {name: 'Circuit Abbey'},
        hp:   12
    },
    {
        name: '???-2? ?? aluminiym',
        mkr:  {name: 'Paratek'},
        hp:   4
    },
    {
        name: 'Dual ADSR / VCA',
        mkr:  {name: 'D&D Modules'},
        hp:   10
    },
    {
        name: 'Otto MIDI',
        mkr:  {name: 'Manikk'},
        hp:   2
    },
    {
        name: 'ADDAC308',
        mkr:  {name: 'ADDAC System'},
        hp:   4
    },
    {
        name: 'Delta VCF Black',
        mkr:  {name: 'G-Storm Electro'},
        hp:   8
    },
    {
        name: '2xADSR r1-2',
        mkr:  {name: 'G-Storm Electro'},
        hp:   8
    },
    {
        name: 'AD Multi VCO',
        mkr:  {name: 'Radical Frequencies'},
        hp:   18
    },
    {
        name: 'ED104 - Dual VCA',
        mkr:  {name: 'Elby Designs'},
        hp:   16
    },
    {
        name: 'ED107 PolyDAC 4-Channel MIDI-CV',
        mkr:  {name: 'Elby Designs'},
        hp:   30
    },
    {
        name: 'CV TO DMX INTERFACE',
        mkr:  {name: 'EMW'},
        hp:   8
    },
    {
        name: 'error-modular SPIKES paul tas edition',
        mkr:  {name: 'Error Instruments'},
        hp:   20
    },
    {
        name: 'BMC40 - Dual Logic',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   null
    },
    {
        name: 'Volts',
        mkr:  {name: 'PMFoundations'},
        hp:   4
    },
    {
        name: '2069',
        mkr:  {name: 'Bard'},
        hp:   17
    },
    {
        name: '???-1?',
        mkr:  {name: 'Paratek'},
        hp:   10
    },
    {
        name: 'BLM Trippy Dual AR',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   null
    },
    {
        name: 'SWITCH INTERFACE 2',
        mkr:  {name: 'EMW'},
        hp:   8
    },
    {
        name: '???-1?',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: '???-2 relic',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: 'Hex Fuzz Amplifier',
        mkr:  {name: 'SynQuaNon'},
        hp:   6
    },
    {
        name: 'Hex VCF',
        mkr:  {name: 'SynQuaNon'},
        hp:   12
    },
    {
        name: 'M-613 3ch stereo slider mixer expansion',
        mkr:  {name: 'Ladik'},
        hp:   12
    },
    {
        name: 'CLM-1',
        mkr:  {name: 'X-Fade Modular'},
        hp:   4
    },
    {
        name: 'ATG',
        mkr:  {name: 'SynQuaNon'},
        hp:   10
    },
    {
        name: 'dVCA',
        mkr:  {name: 'Olitronik Circuits'},
        hp:   5
    },
    {
        name: 'Resonant Filter Sequencer',
        mkr:  {name: 'EMW'},
        hp:   16
    },
    {
        name: 'Step Modulator',
        mkr:  {name: 'EMW'},
        hp:   10
    },
    {
        name: 'Sonic Lullaby WHITE WASH',
        mkr:  {name: 'Error Instruments'},
        hp:   8
    },
    {
        name: 'QUAD LFO',
        mkr:  {name: 'oZoe.fr'},
        hp:   null
    },
    {
        name: '???????R-3c black',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: '???????R-2c black',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: 'A/B++ (white panel)',
        mkr:  {name: 'ph modular'},
        hp:   7
    },
    {
        name: 'Super Controller',
        mkr:  {name: 'Fonitronik'},
        hp:   20
    },
    {
        name: 'Transistor Ring Modulator',
        mkr:  {name: 'OIIIAudio'},
        hp:   4
    },
    {
        name: 'Dual Integrator Model 155',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   14
    },
    {
        name: 'Crossmix',
        mkr:  {name: 'Flame'},
        hp:   6
    },
    {
        name: 'Elvis Filter',
        mkr:  {name: 'D&D Modules'},
        hp:   13
    },
    {
        name: '7-Channel Amplifier-Attenuator',
        mkr:  {name: 'SynQuaNon'},
        hp:   12
    },
    {
        name: 'Midi To Gate Converter',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   6
    },
    {
        name: 'SequenceMix Custom Option Expansion Panel- multiple',
        mkr:  {name: 'Hinton Instruments'},
        hp:   6
    },
    {
        name: 'mGrids Midi+',
        mkr:  {name: 'Michigan Synth Works'},
        hp:   2
    },
    {
        name: 'WAVE MORPH VCDCO',
        mkr:  {name: 'Mazzatron'},
        hp:   12
    },
    {
        name: 'HI HAT',
        mkr:  {name: 'Orpho'},
        hp:   4
    },
    {
        name: 'VCA',
        mkr:  {name: 'New Systems Instruments'},
        hp:   6
    },
    {
        name: '1u to 3u Adapter (Pulplogic)',
        mkr:  {name: 'Abyss Devices'},
        hp:   10
    },
    {
        name: 'Through-Hole Ripples',
        mkr:  {name: 'Analog Ordnance'},
        hp:   null
    },
    {
        name: 'BMC53',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   null
    },
    {
        name: 'MFOS 16 step sequencer',
        mkr:  {name: 'MFOS'},
        hp:   null
    },
    {
        name: 'Sly Grogan - Magpie white panel',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'CATCH ATN-A',
        mkr:  {name: 'ReBach'},
        hp:   6
    },
    {
        name: 'SYS-100 INV',
        mkr:  {name: 'Pharmasonic'},
        hp:   6
    },
    {
        name: 'Multiple dual channel RG',
        mkr:  {name: 'ph modular'},
        hp:   6
    },
    {
        name: '???????R-2c aluminium',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: '7-OR',
        mkr:  {name: 'PMFoundations'},
        hp:   4
    },
    {
        name: 'CATCH Noise',
        mkr:  {name: 'ReBach'},
        hp:   6
    },
    {
        name: '13-Pin Output Breakout',
        mkr:  {name: 'SynQuaNon'},
        hp:   16
    },
    {
        name: '???????R-4? black',
        mkr:  {name: 'Paratek'},
        hp:   12
    },
    {
        name: 'ARP4075 Filter Clone [80-th chips]',
        mkr:  {name: 'OIIIAudio'},
        hp:   10
    },
    {
        name: 'Am8007',
        mkr:  {name: 'AMSynths'},
        hp:   14
    },
    {
        name: 'Lumanoise v4',
        mkr:  {name: 'Laboratorio Elettronico Popolare'},
        hp:   null
    },
    {
        name: 'M-178 Mixer Input Expander',
        mkr:  {name: 'Ladik'},
        hp:   12
    },
    {
        name: 'HG-16',
        mkr:  {name: 'Audiospektri'},
        hp:   24
    },
    {
        name: 'CATCH STV',
        mkr:  {name: 'ReBach'},
        hp:   4
    },
    {
        name: 'SYS-100 Ring Mod',
        mkr:  {name: 'Pharmasonic'},
        hp:   6
    },
    {
        name: '???????R-3c8',
        mkr:  {name: 'Paratek'},
        hp:   12
    },
    {
        name: '???-1 ?? black',
        mkr:  {name: 'Paratek'},
        hp:   3
    },
    {
        name: '',
        mkr:  {name: '-145 5-ch Mixer'},
        hp:   40
    },
    {
        name: 'RING MOD',
        mkr:  {name: 'Volt-a-tone'},
        hp:   6
    },
    {
        name: 'Hex VCA',
        mkr:  {name: 'SynQuaNon'},
        hp:   18
    },
    {
        name: 'Noise Square (Magpie)',
        mkr:  {name: 'Bastl Instruments'},
        hp:   5
    },
    {
        name: 'Prime Mover',
        mkr:  {name: 'Noise Lab'},
        hp:   16
    },
    {
        name: 'VCO MFOS w/CV4',
        mkr:  {name: 'MFOS'},
        hp:   3320
    },
    {
        name: 'BMC49',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   null
    },
    {
        name: 'BMC058 Yes No Maybe',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   null
    },
    {
        name: '???????R-3c',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: 'BLM Cubensis VCO',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   null
    },
    {
        name: '???????R-2?',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: 'Primal Hyperchaos (Magpie Modular panel)',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   null
    },
    {
        name: 'VC Signal Switcher',
        mkr:  {name: 'EMW'},
        hp:   4
    },
    {
        name: 'NS1 Nanosynth 3D',
        mkr:  {name: 'Soundmachines'},
        hp:   46
    },
    {
        name: 'MIDI Port',
        mkr:  {name: 'Vinicius Electrik'},
        hp:   16
    },
    {
        name: 'CATCH SMP',
        mkr:  {name: 'ReBach'},
        hp:   4
    },
    {
        name: 'ATOF',
        mkr:  {name: 'Mutant Modular'},
        hp:   4
    },
    {
        name: 'G????-1',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: '???-1?',
        mkr:  {name: 'Paratek'},
        hp:   10
    },
    {
        name: 'BLM Quinarius',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   null
    },
    {
        name: 'FM Sinus Problem',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   null
    },
    {
        name: 'Pearl (White Face)',
        mkr:  {name: 'Recovery Effects and Devices'},
        hp:   8
    },
    {
        name: 'rBPF',
        mkr:  {name: 'York Modular'},
        hp:   3
    },
    {
        name: '???-1? aluminium blue backlight',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: '5-10 black',
        mkr:  {name: 'Paratek'},
        hp:   6
    },
    {
        name: '',
        mkr:  {name: '4dB LPF'},
        hp:   2
    },
    {
        name: 'Rim Shot',
        mkr:  {name: 'Hexinverter Électronique'},
        hp:   8
    },
    {
        name: 'Boost',
        mkr:  {name: 'York Modular'},
        hp:   4
    },
    {
        name: 'DHA-1',
        mkr:  {name: 'Manikin Electronic'},
        hp:   null
    },
    {
        name: '10V Level Converter',
        mkr:  {name: 'EMW'},
        hp:   4
    },
    {
        name: 'SCHLEUßIG CV Expander',
        mkr:  {name: 'LPZW.modules'},
        hp:   8
    },
    {
        name: 'SW-1',
        mkr:  {name: 'X-Fade Modular'},
        hp:   null
    },
    {
        name: 'Nervian VCO',
        mkr:  {name: 'D&D Modules'},
        hp:   16
    },
    {
        name: 'ssi2144 vcf, black magpie version',
        mkr:  {name: 'Circuit Abbey'},
        hp:   6
    },
    {
        name: '???-2 black',
        mkr:  {name: 'Paratek'},
        hp:   8
    },
    {
        name: 'ASR-LFO',
        mkr:  {name: 'EMW'},
        hp:   6
    },
    {
        name: 'Dual Amplifier',
        mkr:  {name: 'EMW'},
        hp:   6
    },
    {
        name: '????? aluminium',
        mkr:  {name: 'Paratek'},
        hp:   4
    },
    {
        name: 'synthCube BMC038 Dual Panel Keyboard',
        mkr:  {name: 'Barton Musical Circuits'},
        hp:   26
    },
    {
        name: '3320-VCF',
        mkr:  {name: 'PMFoundations'},
        hp:   6
    },
    {
        name: 'euEM2-B',
        mkr:  {name: 'Northern Light Modular'},
        hp:   18
    },
    {
        name: 'Threshold',
        mkr:  {name: 'Pharmasonic'},
        hp:   16
    },
    {
        name: 'MIDI THRU',
        mkr:  {name: 'Tokyo Tape Music Center'},
        hp:   4
    },
    {
        name: 'Thomas Henry PAL VCF',
        mkr:  {name: 'Fonitronik'},
        hp:   null
    },
    {
        name: 'uMGTV',
        mkr:  {name: 'Flame'},
        hp:   5
    },
    {
        name: 'Tracky Dacks - Magpie white panel',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'BMC004 Clock/Divider - synthCube',
        mkr:  {name: 'synthCube'},
        hp:   8
    },
    {
        name: 'BMC013 Random Resonator - synthCube',
        mkr:  {name: 'synthCube'},
        hp:   8
    },
    {
        name: 'MIDI-CV-1',
        mkr:  {name: 'PMFoundations'},
        hp:   4
    },
    {
        name: 'Bongo Fury',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: 'VCF SH-5X',
        mkr:  {name: 'EMW'},
        hp:   10
    },
    {
        name: 'ADSR',
        mkr:  {name: 'York Modular'},
        hp:   6
    },
    {
        name: 'Ribbonz',
        mkr:  {name: 'Monde Synthesizer'},
        hp:   10
    },
    {
        name: 'SW-2',
        mkr:  {name: 'X-Fade Modular'},
        hp:   null
    },
    {
        name: '???-1 ?? relic',
        mkr:  {name: 'Paratek'},
        hp:   3
    },
    {
        name: 'CV Alesis Ineko. Additional circuits by Flavio Mireles',
        mkr:  {name: 'Blue Lantern Modules'},
        hp:   null
    },
    {
        name: 'BMC031 Quad Trap LFO - synthCube',
        mkr:  {name: 'synthCube'},
        hp:   8
    },
    {
        name: 'Digital HiHat - synthCube',
        mkr:  {name: 'synthCube'},
        hp:   8
    },
    {
        name: 'Neuron Magpie Black Panel',
        mkr:  {name: 'Nonlinearcircuits'},
        hp:   8
    },
    {
        name: '5-10 aluminium',
        mkr:  {name: 'Paratek'},
        hp:   2
    },
    {
        name: 'MG - Mutagen Expander',
        mkr:  {name: 'Beast-Tek'},
        hp:   2
    },
    {
        name: 'BMC019 Delaying AR Generator - synthCube',
        mkr:  {name: 'synthCube'},
        hp:   8
    },
    {
        name: 'BMC046 Digital Noise - synthCube',
        mkr:  {name: 'synthCube'},
        hp:   6
    },
    {
        name: '???-2?? Aluminium',
        mkr:  {name: 'Paratek'},
        hp:   4
    },
    {
        name: 'BMC004 5X Clock Divider - synthCube',
        mkr:  {name: 'synthCube'},
        hp:   8
    },
    {
        name: 'MRG ADSR',
        mkr:  {name: 'MRG Synthesizers'},
        hp:   4
    },
    {
        name: 'EQ Joy',
        mkr:  {name: 'Shock Electronix'},
        hp:   13
    },
    {
        name: '3320 Low-Pass Filter (LPF) Classic Edition',
        mkr:  {name: 'Wavefonix'},
        hp:   10
    }
];

