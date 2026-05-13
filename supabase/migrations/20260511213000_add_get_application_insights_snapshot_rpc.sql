create or replace function public.get_application_insights_snapshot(
  p_days integer default 30
)
returns table (
  statistics jsonb,
  activity_series jsonb,
  module_insights jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      greatest(coalesce(p_days, 30), 1) as days,
      date_trunc('day', timezone('utc', now())) as today_utc,
      date_trunc('day', timezone('utc', now())) - make_interval(days => greatest(coalesce(p_days, 30), 1) - 1) as activity_start_utc,
      date_trunc('day', timezone('utc', now())) - interval '29 days' as last_30_days_utc,
      date_trunc('day', timezone('utc', now())) - interval '6 days' as last_7_days_utc,
      date_trunc('day', timezone('utc', now())) - interval '89 days' as last_90_days_utc,
      date_trunc('day', timezone('utc', now())) - interval '364 days' as last_365_days_utc,
      date_trunc('day', timezone('utc', now())) - interval '729 days' as last_2_years_utc,
      date_trunc('day', timezone('utc', now())) - interval '1094 days' as last_3_years_utc
  ),
  public_modules as (
    select
      m.id,
      coalesce(m.hp, 0) as hp,
      coalesce(m.created, m.updated, timezone('utc', now())) as created,
      coalesce(m.updated, timezone('utc', now())) as updated,
      coalesce(man.name, 'Unknown maker') as manufacturer_name,
      coalesce(std.name, 'Unknown standard') as standard_name
    from public.modules m
    left join public.manufacturers man on man.id = m."manufacturerId"
    left join public.standards std on std.id = m.standard
    where m.public = true
  ),
  public_visible_racks as (
    select
      r.id,
      r.authorid,
      coalesce(r.updated, timezone('utc', now())) as updated
    from public.racks r
    join public.profiles p on p.id = r.authorid
    where r.public = true
      and p.public = true
  ),
  public_connected_patches as (
    select
      p.id,
      p.authorid,
      coalesce(p.updated, timezone('utc', now())) as updated
    from public.patches p
    where p.public = true
      and exists (
        select 1
        from public.patch_connections pc
        where pc.patchid = p.id
      )
  ),
  module_rows as (
    select
      pm.*,
      (pm.standard_name ilike '%1u%') as is_one_u,
      case
        when pm.hp <= 2 then '0-2 HP'
        when pm.hp <= 5 then '3-5 HP'
        when pm.hp <= 8 then '6-8 HP'
        when pm.hp <= 16 then '9-16 HP'
        when pm.hp <= 28 then '17-28 HP'
        else '29+ HP'
      end as hp_band_label
    from public_modules pm
  ),
  manufacturer_counts as (
    select manufacturer_name as label, count(*)::int as count
    from module_rows
    group by manufacturer_name
  ),
  active_manufacturer_counts as (
    select mr.manufacturer_name as label, count(*)::int as count
    from module_rows mr
    cross join params
    where mr.updated >= params.last_30_days_utc
    group by mr.manufacturer_name
  ),
  manufacturer_stats as (
    select
      mr.manufacturer_name as label,
      count(*)::int as total_modules,
      coalesce(sum(mr.hp), 0)::int as total_hp,
      count(*) filter (where mr.is_one_u)::int as one_u_modules
    from module_rows mr
    group by mr.manufacturer_name
  ),
  standard_counts as (
    select mr.standard_name as label, count(*)::int as count
    from module_rows mr
    group by mr.standard_name
  ),
  standard_activity_counts as (
    select mr.standard_name as label, count(*)::int as count
    from module_rows mr
    cross join params
    where mr.updated >= params.last_30_days_utc
    group by mr.standard_name
  ),
  standard_width_averages as (
    select mr.standard_name as label, round(avg(mr.hp))::int as count
    from module_rows mr
    group by mr.standard_name
  ),
  standard_manufacturer_counts as (
    select mr.standard_name as label, count(distinct mr.manufacturer_name)::int as count
    from module_rows mr
    group by mr.standard_name
  ),
  hp_band_order as (
    select *
    from (values
      ('0-2 HP', 1),
      ('3-5 HP', 2),
      ('6-8 HP', 3),
      ('9-16 HP', 4),
      ('17-28 HP', 5),
      ('29+ HP', 6)
    ) as bands(label, ord)
  ),
  hp_band_counts as (
    select mr.hp_band_label as label, count(*)::int as count
    from module_rows mr
    group by mr.hp_band_label
  ),
  hp_band_activity_counts as (
    select mr.hp_band_label as label, count(*)::int as count
    from module_rows mr
    cross join params
    where mr.updated >= params.last_30_days_utc
    group by mr.hp_band_label
  ),
  hp_exact_counts as (
    select mr.hp as hp_value, count(*)::int as count
    from module_rows mr
    where mr.hp > 0
    group by mr.hp
  ),
  freshness_stats as (
    select
      count(*) filter (where mr.updated >= params.last_7_days_utc)::int as updated_last_7_days,
      count(*) filter (where mr.updated >= params.last_30_days_utc)::int as updated_last_30_days,
      count(*) filter (where mr.updated >= params.last_90_days_utc)::int as updated_last_90_days,
      count(*) filter (where mr.updated >= params.last_365_days_utc)::int as updated_last_365_days
    from module_rows mr
    cross join params
  ),
  created_window_stats as (
    select
      count(*) filter (where mr.created >= params.last_365_days_utc)::int as created_last_365_days,
      count(*) filter (where mr.created < params.last_365_days_utc and mr.created >= params.last_2_years_utc)::int as created_last_2_years,
      count(*) filter (where mr.created < params.last_2_years_utc and mr.created >= params.last_3_years_utc)::int as created_last_3_years,
      count(*) filter (where mr.created < params.last_3_years_utc)::int as created_older
    from module_rows mr
    cross join params
  ),
  manufacturer_distribution as (
    select
      coalesce((select sum(top_counts.count) from (
        select count
        from manufacturer_counts
        order by count desc, label asc
        limit 5
      ) as top_counts), 0)::int as top_five_modules,
      count(*) filter (where count = 1)::int as solo_manufacturer_count,
      coalesce(percentile_disc(0.5) within group (order by count), 0)::int as median_modules_per_manufacturer
    from manufacturer_counts
  ),
  hp_stats as (
    select
      coalesce(round(avg(mr.hp))::int, 0) as average_hp,
      coalesce(percentile_disc(0.5) within group (order by mr.hp), 0)::int as median_hp
    from module_rows mr
    where mr.hp > 0
  ),
  catalogue_age_stats as (
    select
      coalesce(
        round(
          percentile_cont(0.5) within group (
            order by greatest(extract(epoch from (timezone('utc', now()) - mr.created)) / 31536000.0, 0)
          )
        )::int,
        0
      ) as median_catalogue_age_years
    from module_rows mr
  ),
  activity_days as (
    select generate_series(
      (select activity_start_utc::date from params),
      (select today_utc::date from params),
      interval '1 day'
    )::date as day
  ),
  module_activity as (
    select mr.updated::date as day, count(*)::int as count
    from module_rows mr
    cross join params
    where mr.updated >= params.activity_start_utc
    group by mr.updated::date
  ),
  rack_activity as (
    select pr.updated::date as day, count(*)::int as count
    from public_visible_racks pr
    cross join params
    where pr.updated >= params.activity_start_utc
    group by pr.updated::date
  ),
  patch_activity as (
    select pp.updated::date as day, count(*)::int as count
    from public_connected_patches pp
    cross join params
    where pp.updated >= params.activity_start_utc
    group by pp.updated::date
  )
  select
    jsonb_build_object(
      'publicModules', (select count(*)::int from module_rows),
      'publicManufacturers', (select count(distinct label)::int from manufacturer_counts),
      'publicProfiles', (select count(*)::int from public.profiles where public = true),
      'publicModulesUpdatedLast30Days', (select updated_last_30_days from freshness_stats),
      'publicRacks', (select count(*)::int from public_visible_racks),
      'publicRackAuthors', (select count(distinct authorid)::int from public_visible_racks),
      'publicRacksUpdatedLast30Days', (
        select count(*)::int
        from public_visible_racks
        cross join params
        where updated >= params.last_30_days_utc
      ),
      'publicPatches', (select count(*)::int from public_connected_patches),
      'publicPatchConnections', (
        select count(*)::int
        from public.patch_connections pc
        join public_connected_patches pp on pp.id = pc.patchid
      ),
      'publicPatchAuthors', (
        select count(distinct p.id)::int
        from public.profiles p
        join public_connected_patches pp on pp.authorid = p.id
        where p.public = true
      ),
      'publicPatchesUpdatedLast30Days', (
        select count(*)::int
        from public_connected_patches
        cross join params
        where updated >= params.last_30_days_utc
      )
    ) as statistics,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', to_char(ad.day, 'YYYY-MM-DD'),
            'modules', coalesce(ma.count, 0),
            'racks', coalesce(ra.count, 0),
            'patches', coalesce(pa.count, 0)
          )
          order by ad.day
        ),
        '[]'::jsonb
      )
      from activity_days ad
      left join module_activity ma on ma.day = ad.day
      left join rack_activity ra on ra.day = ad.day
      left join patch_activity pa on pa.day = ad.day
    ) as activity_series,
    jsonb_build_object(
      'topManufacturers', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', count, 'detail', count || ' public modules') order by count desc, label asc),
          '[]'::jsonb
        )
        from (
          select label, count
          from manufacturer_counts
          order by count desc, label asc
          limit 5
        ) ranked
      ),
      'activeManufacturers', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', count, 'detail', count || ' modules updated in the last 30 days') order by count desc, label asc),
          '[]'::jsonb
        )
        from (
          select label, count
          from active_manufacturer_counts
          order by count desc, label asc
          limit 5
        ) ranked
      ),
      'widestManufacturers', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', score, 'detail', score || ' HP average across ' || total_modules || ' public modules') order by score desc, label asc),
          '[]'::jsonb
        )
        from (
          select
            label,
            round((total_hp::numeric / total_modules))::int as score,
            total_modules
          from manufacturer_stats
          where total_modules >= 5
          order by score desc, label asc
          limit 5
        ) ranked
      ),
      'oneUManufacturers', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', score, 'detail', score || '% 1U share across ' || total_modules || ' public modules') order by score desc, label asc),
          '[]'::jsonb
        )
        from (
          select
            label,
            round((one_u_modules::numeric / total_modules) * 100)::int as score,
            total_modules
          from manufacturer_stats
          where total_modules >= 5
            and one_u_modules >= 2
          order by score desc, label asc
          limit 5
        ) ranked
      ),
      'standardMix', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', count, 'detail', count || ' public modules in this format') order by count desc, label asc),
          '[]'::jsonb
        )
        from (
          select label, count
          from standard_counts
          order by count desc, label asc
        ) ranked
      ),
      'standardActivity', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', count, 'detail', count || ' modules updated in the last 30 days') order by count desc, label asc),
          '[]'::jsonb
        )
        from (
          select label, count
          from standard_activity_counts
          order by count desc, label asc
          limit 5
        ) ranked
      ),
      'standardWidthAverages', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', count, 'detail', count || ' HP average width') order by count desc, label asc),
          '[]'::jsonb
        )
        from (
          select label, count
          from standard_width_averages
          order by count desc, label asc
          limit 5
        ) ranked
      ),
      'standardManufacturerCounts', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', label, 'count', count, 'detail', count || ' makers represented in this format') order by count desc, label asc),
          '[]'::jsonb
        )
        from (
          select label, count
          from standard_manufacturer_counts
          order by count desc, label asc
          limit 5
        ) ranked
      ),
      'hpBands', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', hbo.label, 'count', coalesce(hbc.count, 0), 'detail', coalesce(hbc.count, 0) || ' modules in this size band') order by hbo.ord),
          '[]'::jsonb
        )
        from hp_band_order hbo
        left join hp_band_counts hbc on hbc.label = hbo.label
        where coalesce(hbc.count, 0) > 0
      ),
      'hpBandActivity', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', hbo.label, 'count', coalesce(hbac.count, 0), 'detail', coalesce(hbac.count, 0) || ' modules updated in the last 30 days') order by hbo.ord),
          '[]'::jsonb
        )
        from hp_band_order hbo
        left join hp_band_activity_counts hbac on hbac.label = hbo.label
        where coalesce(hbac.count, 0) > 0
      ),
      'hpExact', (
        select coalesce(
          jsonb_agg(jsonb_build_object('label', hp_value || ' HP', 'count', count, 'detail', count || ' modules at this exact width') order by count desc, hp_value asc),
          '[]'::jsonb
        )
        from (
          select hp_value, count
          from hp_exact_counts
          order by count desc, hp_value asc
          limit 8
        ) ranked
      ),
      'freshnessWindows', jsonb_build_array(
        jsonb_build_object('label', 'Updated in 7 days', 'count', (select updated_last_7_days from freshness_stats), 'detail', (select updated_last_7_days from freshness_stats) || ' public modules updated in the last week'),
        jsonb_build_object('label', 'Updated in 30 days', 'count', (select updated_last_30_days from freshness_stats), 'detail', (select updated_last_30_days from freshness_stats) || ' public modules updated in the last month'),
        jsonb_build_object('label', 'Updated in 90 days', 'count', (select updated_last_90_days from freshness_stats), 'detail', (select updated_last_90_days from freshness_stats) || ' public modules updated in the last quarter'),
        jsonb_build_object('label', 'Updated in 365 days', 'count', (select updated_last_365_days from freshness_stats), 'detail', (select updated_last_365_days from freshness_stats) || ' public modules updated in the last year')
      ),
      'createdWindows', jsonb_build_array(
        jsonb_build_object('label', 'Added in last year', 'count', (select created_last_365_days from created_window_stats), 'detail', (select created_last_365_days from created_window_stats) || ' public modules were added in the last year'),
        jsonb_build_object('label', 'Added 1-2 years ago', 'count', (select created_last_2_years from created_window_stats), 'detail', (select created_last_2_years from created_window_stats) || ' public modules were added one to two years ago'),
        jsonb_build_object('label', 'Added 2-3 years ago', 'count', (select created_last_3_years from created_window_stats), 'detail', (select created_last_3_years from created_window_stats) || ' public modules were added two to three years ago'),
        jsonb_build_object('label', 'Added over 3 years ago', 'count', (select created_older from created_window_stats), 'detail', (select created_older from created_window_stats) || ' public modules were added over three years ago')
      ),
      'topFiveManufacturerShare', (
        select
          case
            when (select count(*) from module_rows) > 0
              then round((top_five_modules::numeric / (select count(*) from module_rows)) * 100)::int
            else 0
          end
        from manufacturer_distribution
      ),
      'soloManufacturerCount', (select solo_manufacturer_count from manufacturer_distribution),
      'medianModulesPerManufacturer', (select median_modules_per_manufacturer from manufacturer_distribution),
      'medianCatalogueAgeYears', (select median_catalogue_age_years from catalogue_age_stats),
      'staleModules', greatest((select count(*)::int from module_rows) - (select updated_last_365_days from freshness_stats), 0),
      'averageHp', (select average_hp from hp_stats),
      'medianHp', (select median_hp from hp_stats)
    ) as module_insights
  from params;
$$;

revoke all on function public.get_application_insights_snapshot(integer) from public;
grant execute on function public.get_application_insights_snapshot(integer) to anon;
grant execute on function public.get_application_insights_snapshot(integer) to authenticated;
