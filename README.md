# Apex Racing 🏁

Juego de carreras de F1 top-down, hecho con HTML5 Canvas en un único archivo
(`index.html`). Incluye torneo de 3 circuitos (Montmeló, Monza, Silverstone),
rivales con IA, controles táctiles para móvil y soporte PWA (instalable como app).

## Jugar en local

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8010
# luego abre http://localhost:8010
```

(En Windows puedes usar `start.bat`.)

## Publicar en GitHub Pages (URL pública para el móvil)

El repositorio incluye un workflow (`.github/workflows/deploy-pages.yml`) que
despliega el sitio automáticamente. Pasos a hacer una sola vez en GitHub:

1. **Hacer el repositorio público** (necesario para Pages gratis):
   `Settings → General → Danger Zone → Change repository visibility → Make public`.
2. **Activar Pages con GitHub Actions**:
   `Settings → Pages → Build and deployment → Source: GitHub Actions`.
3. Vuelve a lanzar el workflow (`Actions → Deploy to GitHub Pages → Re-run`),
   o haz cualquier push. Al terminar, el juego estará en:

   ```
   https://carbaxo.github.io/formula1/
   ```

## Instalar como app en el móvil

Abre la URL anterior en el móvil y:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*.
- **iPhone (Safari):** botón *Compartir* → *Añadir a pantalla de inicio*.

Se abrirá a pantalla completa, con su icono, como una app nativa, y funciona
sin conexión una vez cargada.

## Controles

- **Teclado:** `W`/`↑` acelerar, `S`/`↓` frenar, `A`/`D` o `←`/`→` girar, `R` reiniciar.
- **Móvil:** pad de dirección (izquierda) y acelerar/frenar (derecha).
