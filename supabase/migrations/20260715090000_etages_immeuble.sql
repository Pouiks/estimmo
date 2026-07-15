-- Nombre d'étages de l'immeuble (appartements) : permet de détecter
-- automatiquement le dernier étage (bonus moteur) sans le demander en atout.
alter table leads
  add column if not exists etages_immeuble int;
