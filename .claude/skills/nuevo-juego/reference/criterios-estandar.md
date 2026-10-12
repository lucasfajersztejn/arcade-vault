# Criterios de aceptación estándar de una spec de juego

Cópialos en la spec y adapta `{{…}}`. Quita los que no apliquen (con motivo) y añade los propios de las mecánicas del juego, siempre booleanos y verificables.

## Build y calidad

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `get_advisors` (seguridad) no reporta avisos nuevos tras la migración.
- [ ] `grep -r "service_role" app components lib` no devuelve resultados.

## Catálogo

- [ ] `select id, cat, cover, color from games where id = '{{id}}'` devuelve una fila con los valores de la spec.
- [ ] `/games` muestra la tarjeta «{{TITLE}}» con su portada `cover-{{id}}` y los demás juegos siguen en su orden.
- [ ] El filtro de la categoría `{{cat}}` incluye {{TITLE}}.
- [ ] `/games/{{id}}` muestra el detalle y «JUGAR AHORA» lleva a `/games/{{id}}/jugar`.

## Juego

- [ ] `/games/{{id}}/jugar` muestra el canvas dentro del marco CRT; no aparecen la arena simulada ni el `setInterval` de puntuación.
- [ ] {{controles}}: cada tecla hace lo descrito en la spec.
- [ ] {{regla de puntuación 1}}: suma exactamente {{N}} puntos y el HUD de la plataforma lo refleja al instante.
- [ ] El HUD muestra {{hud}} con valores reales.
- [ ] PAUSA congela el juego (el estado no cambia durante la pausa) y REANUDAR continúa sin saltos; ocultar la pestaña o perder el foco pausa.
- [ ] Fin de partida ({{condición}}) o pulsar FIN abre «FIN DEL JUEGO» con la puntuación final correcta; el canvas no muestra su propio game over ni reinicia con tecla.
- [ ] «JUGAR DE NUEVO» reinicia al estado inicial sin duplicar el bucle (la velocidad no aumenta tras varios reinicios).
- [ ] Escribir un nombre en el input del modal (incluidas barra espaciadora y flechas) no mueve el juego ni hace scroll.
- [ ] Salir con SALIR o navegar a otra ruta no deja listeners ni bucles activos: las flechas y Espacio vuelven a hacer scroll en otras páginas.
- [ ] A ancho ≤ 768 px el canvas se escala sin scroll horizontal; en `(pointer: coarse)` aparece el aviso de teclado (si aplica).

## Leaderboard

- [ ] «GUARDAR PUNTUACIÓN» crea una fila en `scores` con `game_id = '{{id}}'`, el nombre escrito (o `INVITADO`) y la puntuación final.
- [ ] La puntuación aparece en el ranking de `/games/{{id}}` al recargar, si supera la mejor marca previa de ese nombre.
- [ ] Hay una pestaña «{{TITLE}}» en `/salon` con podio y tabla coherentes con la vista `leaderboard`.
- [ ] Con sesión iniciada, «TU MEJOR MARCA EN {{TITLE}}» muestra la marca y el rango reales.
- [ ] Sin puntuaciones, el ranking muestra «Sé el primero en puntuar».
- [ ] `plays` y «Mejor global» de `/games/{{id}}` coinciden con `count(*)` y `max(score)` de `scores`.

## Sin regresiones

- [ ] `/games/asteroids/jugar` y un juego simulado (`/games/rocas/jugar`) funcionan como antes.
- [ ] `git diff` no toca `lib/games/asteroids/` ni `components/asteroids-canvas.tsx` (salvo que la spec lo justifique).
- [ ] `git status` no muestra cambios en `refereences/`.
- [ ] `lib/db/`, `app/salon/` y `components/leaderboard.tsx` no cambian (salvo justificación en la spec).
- [ ] La sesión `av_user` sigue funcionando.

## Proceso

- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para la portada y la UI nueva y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [ ] Se leyó la documentación local de Next 16.4 antes de escribir código.
- [ ] Capturas de Playwright en `.playwright-screenshots/` y artefactos del MCP en `.playwright-mcp/` (escritorio y ≤ 768 px).

## Verificación manual recomendada (paso final del plan)

1. `npm run lint` y `npm run build`.
2. `npm run dev`, jugar una partida completa, guardar con nombre y sin nombre.
3. Recorrer con Playwright: `/games`, `/games/{{id}}`, `/games/{{id}}/jugar`, `/salon`, en escritorio y ≤ 768 px.
4. `execute_sql`: comprobar la fila en `scores` y las vistas.
5. `get_advisors` de seguridad.
