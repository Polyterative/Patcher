export interface RackBalanceAxisDefinition {
  id: RackBalanceAxisId;
  label: string;
  icon: string;
  purposePatterns: RegExp[];
  naturePatterns: RegExp[];
  guidance: {
    low: string;
    balanced: string;
    high: string;
  };
}

export type RackBalanceAxisId =
  | 'voices'
  | 'modulation'
  | 'utilities'
  | 'timing'
  | 'tone';

export const LOW_AXIS_SHARE = 14;
export const HIGH_AXIS_SHARE = 32;
export const LOW_TAG_COVERAGE = 0.5;

export const RACK_BALANCE_AXES: RackBalanceAxisDefinition[] = [
  {
    id: 'voices',
    label: 'Voices',
    icon: 'graphic_eq',
    purposePatterns: [
      /\bvco\b/i,
      /\bosc/i,
      /\bvoice\b/i,
      /\bdrum\b/i,
      /\bsampler?\b/i,
      /\bgranular\b/i,
      /\bnoise\b/i
    ],
    naturePatterns: [],
    guidance: {
      low: 'Light on direct sound sources; the rack may lean on external audio or supporting roles.',
      balanced: 'A healthy amount of sound-generation is present without dominating the whole system.',
      high: 'The rack emphasizes sound sources, which can be great if that voice-heavy direction is intentional.'
    }
  },
  {
    id: 'modulation',
    label: 'Modulation',
    icon: 'swap_calls',
    purposePatterns: [
      /\blfo\b/i,
      /\benvelope\b/i,
      /\bfunction\b/i,
      /\bmodulat/i,
      /\brandom\b/i,
      /\bslew\b/i,
      /\bcontroller\b/i
    ],
    naturePatterns: [],
    guidance: {
      low: 'Modulation looks light, so movement may depend on a small set of sources.',
      balanced: 'Modulation support looks reasonably covered for shaping and movement.',
      high: 'The rack dedicates a lot of space to control and motion, which can support complex patching.'
    }
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: 'build',
    purposePatterns: [
      /\bvca\b/i,
      /\bmix/i,
      /\bmult/i,
      /\batten/i,
      /\boffset\b/i,
      /\blogic\b/i,
      /\brouter?\b/i,
      /\bswitch\b/i,
      /\bscale\b/i
    ],
    naturePatterns: [
      /\butility\b/i,
      /\btool\b/i,
      /\bhelper\b/i
    ],
    guidance: {
      low: 'Utility coverage looks thin, so routing, attenuation, and glue duties may get tight.',
      balanced: 'Utility coverage looks solid enough to support the rack without taking over.',
      high: 'A lot of space goes to support modules, suggesting a flexible patching-focused system.'
    }
  },
  {
    id: 'timing',
    label: 'Timing',
    icon: 'timer',
    purposePatterns: [
      /\bclock\b/i,
      /\bsequenc/i,
      /\btrigger\b/i,
      /\bgate\b/i,
      /\bquant/i,
      /\barp/i,
      /\beuclid/i
    ],
    naturePatterns: [],
    guidance: {
      low: 'Timing and sequencing tools appear limited, which may keep the rack more manual or externally driven.',
      balanced: 'Timing support looks balanced for sequencing, clocks, and event control.',
      high: 'The rack leans heavily into timing and sequencing, useful for structured or generative workflows.'
    }
  },
  {
    id: 'tone',
    label: 'Tone shaping',
    icon: 'tune',
    purposePatterns: [
      /\bfilter\b/i,
      /\beq\b/i,
      /\bwave\b/i,
      /\bshaper\b/i,
      /\beffect\b/i,
      /\bdelay\b/i,
      /\breverb\b/i,
      /\bdistortion\b/i
    ],
    naturePatterns: [
      /\bprocessor\b/i
    ],
    guidance: {
      low: 'Tone-shaping looks lighter than the rest, so timbral sculpting may rely on a few key modules.',
      balanced: 'Tone-shaping support looks present without crowding out the rest of the rack.',
      high: 'A large share of the rack is devoted to processing and shaping sound after it is generated.'
    }
  }
];
