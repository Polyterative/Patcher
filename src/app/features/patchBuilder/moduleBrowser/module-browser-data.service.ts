import { Injectable } from '@angular/core';
import { Module }     from '../models/models';

@Injectable()
export class ModuleBrowserDataService {
}

export const modules: Module[] = [
    {
        name: 'Belgrad',
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
