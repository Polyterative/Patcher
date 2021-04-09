export interface EuroModule {
    name: string;
    description?: string;
    mkr: Manufacturer;
    hp: number;
    ins?: CV[];
    outs?: CV[];
    switches?: Switch[];
    manualURL?: string;
}

export interface DBEuroModule {
    name: string;
    manufacturerId: string;
    hp: number;
    description?: string;
    ins: string;
    outs: string;
    switches: string;
    manualURL: string;
    created: string;
    updated: string;
    public: boolean;
    additional: string;
}

export interface LocalEuroModule extends DBEuroModule {
    id: string;
}

export interface LocalManufacturer extends DBManufacturer {
    id: string;
}

export interface DBManufacturer {
    name: string;
    url?: string;
    logo?: string;
    admin?: string;
}

export interface Manufacturer {
    name: string;
    url?: string;
    logo?: string;
    admin?: string;
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
    from: LocalEuroModule;
    fromId: number;
    to: LocalEuroModule;
    toId: number;
}

export interface Patch {
    connections: Connection[];
}

export const modules: EuroModule[] = [
    {
        name:      'Maths',
        mkr:       {name: 'Make Noise'},
        ins:       [
            {
                name: 'Signal Input',
                min:  -10,
                max:  10
            },
            {
                name: 'Trigger Input',
                min:  -10,
                max:  10
            },
            {
                name: 'Rise CV Input',
                min:  -8,
                max:  8
            }
        ],
        hp:        12,
        manualURL: 'http://www.makenoisemusic.com/content/manuals/MATHSmanual2013.pdf'
    },
    {
        name: 'Plaits',
        mkr:  {name: 'Mutable instruments'},
        ins:  [
            {name: 'A'}
        ],
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
        name: 'VCA',
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
        name: 'Mimetic Digitalis',
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
    }
];