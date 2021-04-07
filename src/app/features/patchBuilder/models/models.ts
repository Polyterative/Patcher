interface SwitchPosition {
    name: string,
}

export interface EuroModule {
    name: string;
    manufacturer: Manufacturer;
    ins: CV[];
    outs: CV[];
    hp: number;
    switches?: string[][];
}

export interface Manufacturer {
    name: string;
}

export interface CV {
    title: string;
    description?: string;
    min?: number;
    max?: number;
    isVOCT?: boolean;
}

export interface Connection {
    from: string;
    to: string;
}

export interface Patch {
    connections: Connection[];
}

export const modules: EuroModule[] = [
    {
        name:         'Basimilus Iteritas Alter',
        hp:           12,
        manufacturer: {name: 'Noise Engineering'},
        switches:     [
            [
                'skin',
                'liquid',
                'metal'
            ],
            [
                'basso',
                'alto',
                'treble'
            ]
        ],
        outs:         [
            {
                title: 'Output'
            }
        ],
        ins:          [
            {
                title:  'Pitch',
                isVOCT: true
            },
            {
                title: 'Spread'
            },
            {
                title: 'Attack'
            },
            {
                title: 'S/L/M'
            },
            {
                title: 'B/A/T'
            },
            {
                title: 'Morph'
            },
            {
                title: 'Decay'
            },
            {
                title: 'Trig'
            },
            {
                title: 'OUT'
            }
        ]
    },
    {
        name:         'Belgrad',
        hp:           14,
        manufacturer: {name: 'XAOC'},
        
        outs: [
            {
                title: 'Output'
            }
        ],
        ins:  [
            {
                title: 'Resonance'
            },
            {
                title: 'FM'
            },
            {
                title: 'Input'
            },
            {
                title: 'V-oct'
            },
            {
                title: 'Balance'
            },
            {
                title: 'Span'
            }
        ]
    },
    {
        name:         'Voltage Block',
        hp:           20,
        manufacturer: {name: 'Malekko Heavy Industry'},
        
        outs: [
            {
                title: '1'
            },
            {
                title: '2'
            },
            {
                title: '3'
            },
            {
                title: '4'
            },
            {
                title: '5'
            },
            {
                title: '6'
            },
            {
                title: '7'
            },
            {
                title: '8'
            }
        ],
        ins:  [
            {
                title: 'Clock/CV'
            },
            {
                title: 'Reset/Hold'
            }
        ]
    }
];
