-- Follow-up to 20260618105927_split_purpose_tag_groups.sql.
-- Production rows may already have non-zero, but incorrect, functional types;
-- correct only the approved purpose tag names and avoid no-op rewrites.

update public.tags
set type = 3
where type is distinct from 3
  and name in ('Full Voice', 'VCA', 'VCO');

update public.tags
set type = 4
where type is distinct from 4
  and name in ('Noise');

update public.tags
set type = 5
where type is distinct from 5
  and name in ('VCF', 'LPG', 'EQ');

update public.tags
set type = 6
where type is distinct from 6
  and name in (
    'Clock Gen.',
    'Clock Mod',
    'Env. Follow',
    'Envelope Gen.',
    'Frequency Div.',
    'Function Gen.',
    'LFO',
    'Modulate',
    'Quantize',
    'S&H',
    'Slew Limit',
    'Uncertainty'
  );

update public.tags
set type = 7
where type is distinct from 7
  and name in (
    'Delay',
    'Distort',
    'FX',
    'Phase Shift',
    'Pitch Shift',
    'Reverb',
    'Ring Mod',
    'Waveshape'
  );

update public.tags
set type = 8
where type is distinct from 8
  and name in ('Rhythm', 'Sample', 'Sequence');

update public.tags
set type = 9
where type is distinct from 9
  and name in (
    'Attenuate',
    'Compare',
    'Control',
    'Logic',
    'Mix',
    'Multiply',
    'Pan',
    'Polarize',
    'Quad',
    'Switch',
    'Utility'
  );

update public.tags
set type = 10
where type is distinct from 10
  and name in ('Blank');
