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
                name: 'Output'
            }
        ],
        ins:          [
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
            },
            {
                name: 'OUT'
            }
        ]
    },
    {
        name:         'Belgrad',
        hp:           14,
        manufacturer: {name: 'XAOC'},
        
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
        name:         'Voltage Block',
        hp:           20,
        manufacturer: {name: 'Malekko Heavy Industry'},
        
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
