-- Demande de rappel explicite du prospect (clic « être rappelé » dans l'email).
-- Trace le consentement/intérêt commercial daté (RGPD) et priorise le lead.
alter table leads
  add column if not exists demande_rappel boolean not null default false,
  add column if not exists demande_rappel_at timestamptz;

create index if not exists leads_rappel_idx
  on leads (created_at desc)
  where demande_rappel;
