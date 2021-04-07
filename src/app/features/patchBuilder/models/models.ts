interface SwitchPosition {
    name: string,
}

export interface EuroModule {
    name: string;
    manufacturer?: Manufacturer;
    ins: CV[];
    outs: CV[];
    hp: number;
    switches?: string[][];
}

export interface Manufacturer {
    names: string;
}

export interface CV {
    title: string;
    description?: string;
    min?: number;
    max?: number;
    isVOCT?: boolean;
}

export const modules: EuroModule[] = [
    {
        name:     'Basimilus Iteritas Alter',
        hp:       12,
        switches: [
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
        outs:     [
            {
                title: 'Output'
            }
        ],
        ins:      [
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
        name: 'Belgrad',
        hp:   14,
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
        name: 'Voltage Block',
        hp:   20,
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
