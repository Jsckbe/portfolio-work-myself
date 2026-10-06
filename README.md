# pragz.io — Landing page

## Demo
URL: https://jsckbe.github.io/portfolio-work-myself/

## Archivos

- `index.html`, `style.css`, `script.js`: sitio completo (HTML, CSS y JS puros, sin frameworks).
- `assets/video/beast-video-hero1_alpha.webm`: **máster** del avatar (1080p, VP9 con alfa).
- `assets/video/beast-video-hero1_alpha_lite.webm`: versión optimizada que usa la página (ver abajo).

## Avatar del hero

- **Escritorio**: el mouse controla el `currentTime` del video. El tramo 1.0 s → 3.5 s (mirar al frente → girar a la izquierda) se recorre según la posición X del puntero; a la derecha se usa el video en espejo. Si el mouse sale de la ventana, vuelve a mirar al frente.
- **Móvil (< 768 px)**: bucle ping-pong automático: pausa 3.5 s mirando al frente → ida completa (10 s) → reversa hasta el inicio → pausa… En ciclos alternos el video se refleja para que mire a ambos lados (`alternateSides`).
- El bucle móvil se detiene si el hero no está en pantalla, si la pestaña está oculta o si el usuario tiene "reducir movimiento".
- Todos los ajustes (rangos, pausas, velocidades) están en el objeto `CONFIG` de `script.js`.

### ¿Por qué existe la versión `_lite`?
Buscar cuadros en el máster 1080p con alfa es lento (~480 ms por seek en las pruebas), lo que hace entrecortados el seguimiento del mouse y la reversa. La versión `_lite` está recortada al personaje (540×810), sin audio y con keyframe cada 4 cuadros: ~13 ms por seek y ~2 MB (vs 11 MB).

Para regenerarla:

```bash
ffmpeg -c:v libvpx-vp9 -i assets/video/beast-video-hero1_alpha.webm \
  -vf "crop=720:1080:600:0,scale=540:810:flags=lanczos,format=yuva420p" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -g 4 -crf 38 -b:v 0 -an \
  -row-mt 1 -deadline good -cpu-used 3 assets/video/beast-video-hero1_alpha_lite.webm
```

(`-c:v libvpx-vp9` antes de `-i` es necesario para que ffmpeg lea el canal alfa.)

### Safari / iOS
El soporte del alfa de VP9 en WebM puede variar en Safari. Verifica en un iPhone real; si el fondo no es transparente, exporta un HEVC con alfa (`.mov`) y descomenta la primera `<source>` en `index.html`.

## Tema
El botón sol/luna alterna entre lima (`#AAB12D`) y naranja (`#f65a00`) cambiando `data-theme` en `<html>`. La elección se guarda en `localStorage`. Las sugerencias de contraste y de fondo general están como comentarios al inicio de `style.css`.

## Tecnologías
- HTML5
- CSS3
- JavaScript

## Autor
Jsck
