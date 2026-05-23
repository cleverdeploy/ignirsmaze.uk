INSERT INTO experiments (slug, app_slug, variants, active, notes) VALUES
  ('whisper-llm-vs-templates', 'whisper',
   '[{"name":"A","weight":50},{"name":"B","weight":50}]'::jsonb,
   true,
   'A = Anthropic Haiku replies; B = 8 local template replies (no LLM cost).'),
  ('stone-tick-rate', 'stone',
   '[{"name":"A","weight":50},{"name":"B","weight":50}]'::jsonb,
   true,
   'A = 1 tick/sec; B = 1 tick/2s. Does slower pacing increase wait duration?')
ON CONFLICT (slug) DO NOTHING;
