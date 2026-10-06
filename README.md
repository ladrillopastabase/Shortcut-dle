# ⌨️ Shortcut-dle

Un juego diario estilo Wordle / Pokedle para adivinar **atajos de teclado**.

## Modos

- **⌨️ Combo**: te mostramos una acción y su app; tienes 6 intentos para teclear el atajo (con tu teclado o con el teclado en pantalla). Verde = la tecla está en el atajo; rojo = no está; ⬆️⬇️ = el atajo tiene más o menos teclas.
- **🔎 Clásico**: como Pokedle. Busca atajos y compara app, categoría, modificadores, número de teclas y tecla final hasta dar con el misterioso.

Cada modo tiene un **reto diario** (igual para todo el mundo) y un modo **práctica** ilimitado. Las estadísticas y rachas se guardan en el navegador.

## Desarrollo

Es un sitio estático sin dependencias: abre `index.html` o ejecuta

```sh
python3 -m http.server
```

Los atajos están en `js/data.js`. Para añadir uno, agrega un objeto `{ app, action, keys, alt? }`.

## Publicación

El workflow `.github/workflows/pages.yml` publica el sitio en GitHub Pages en cada push.
