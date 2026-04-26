-- Match lifecycle: optional scheduled start time for auto-activation
ALTER TABLE matches ADD COLUMN IF NOT EXISTS starts_at timestamptz;

-- Team categorization: age group + gender
ALTER TABLE teams ADD COLUMN IF NOT EXISTS category text
  CHECK (category IN ('Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Senior'));
ALTER TABLE teams ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IN ('Masculino', 'Femenino', 'Mixto'));

-- Tournament categorization: age group + gender (replaces free-text category names)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS category text
  CHECK (category IN ('Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Senior'));
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IN ('Masculino', 'Femenino', 'Mixto'));
