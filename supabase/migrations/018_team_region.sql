-- Teams: add region column (was missing, causing silent save failure in AdminEquiposPage)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS region text
  CHECK (region IN (
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
    'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Extremadura', 'Galicia',
    'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco', 'Valencia'
  ));
