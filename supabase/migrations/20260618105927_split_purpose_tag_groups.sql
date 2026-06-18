-- Split the legacy flat PURPOSE tag group (type = 0) into existing functional
-- tag groups. This intentionally changes only tags.type; tag names stay intact.

update public.tags
set type = 3
where type = 0
  and name in ('Full Voice', 'VCA', 'VCO');

update public.tags
set type = 4
where type = 0
  and name in ('Noise');

update public.tags
set type = 5
where type = 0
  and name in ('VCF', 'LPG', 'EQ');

update public.tags
set type = 6
where type = 0
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
where type = 0
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
where type = 0
  and name in ('Rhythm', 'Sample', 'Sequence');

update public.tags
set type = 9
where type = 0
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
where type = 0
  and name in ('Blank');
