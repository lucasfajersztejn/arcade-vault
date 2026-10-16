-- =============================================================================
-- Arcade Vault — catálogo de juegos (prod)
-- Estado real tras `clean_catalog_and_rename_games` + alta de SNAKE y FROGGER.
-- No incluye scores de ejemplo (son ficticios en dev; prod empieza en 0).
-- =============================================================================

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('bloque-buster', 'ARKANOID',
   'Rebota la pelota y destruye muros de neón.',
   'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
   'ARCADE', 'cover-bricks', 'cyan', 1),

  ('caida', 'TETRIS',
   'Encaja las piezas antes de que el techo te aplaste.',
   'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
   'PUZZLE', 'cover-tetro', 'magenta', 2),

  ('asteroids', 'ASTEROIDS',
   'Pilota tu nave y pulveriza el campo de asteroides.',
   'Una nave con inercia flota en un espacio sin bordes. Rota, propulsa y dispara para partir asteroides grandes en fragmentos cada vez más pequeños. Recoge el power-up 3x para disparar en abanico. Tienes tres vidas: úsalas bien.',
   'SHOOTER', 'cover-asteroids', 'cyan', 3),

  ('snake', 'SNAKE',
   'Come, crece y no choques.',
   'Guía a la serpiente por el tablero, come frutas pixel-art y crece sin chocar con las paredes ni con tu propia cola. Cada cinco frutas sube el nivel y la serpiente acelera.',
   'ARCADE', 'cover-snake', 'green', 4),

  ('frogger', 'FROGGER',
   'Cruza la carretera y el río sin convertirte en papilla.',
   'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.',
   'ARCADE', 'cover-frogger', 'green', 5);
