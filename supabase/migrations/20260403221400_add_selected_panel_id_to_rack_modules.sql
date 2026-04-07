alter table rack_modules
  add column selected_panel_id integer null
    references module_panels (id) on delete set null;
