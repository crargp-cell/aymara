# Voz del cóndor

El cóndor prueba tres fuentes de sonido, siempre en este orden:

1. **Una grabación de esta carpeta.** Es la única que enseña pronunciación de
   verdad, así que gana a todo lo demás.
2. **Una voz sintética de aymara**, si el dispositivo la tiene. Hoy no existe en
   ningún navegador (comprobado: Chrome sólo ofrece voces españolas de España);
   el código ya está listo para el día que aparezca.
3. **Una voz española.** Vale para lo narrado en español. Cuando le toca leer una
   palabra aymara, la pantalla avisa de que la pronunciación es aproximada.

## Cómo añadir una grabación

1. Graba la frase en `.mp3`.
2. Guárdala aquí con el **id de la línea** como nombre: `presenta-1.mp3`.
   Los ids están en `src/lib/mascota/guion.ts`, en el campo `id` de cada línea.
3. Añade ese id a `manifiesto.json`:

   ```json
   { "grabaciones": ["presenta-1", "palabra-Kamisaraki"] }
   ```

No hay que tocar código ni reconstruir. Si un id figura en el manifiesto pero
falta el archivo, el cóndor cae a la voz sintética en lugar de quedarse mudo.

## Por dónde empezar

Las que más lo merecen son las frases en aymara (`idioma: "ay"` en el guion): el
saludo `presenta-1` y las palabras del diccionario. Una palabra mal pronunciada
es lo primero que el alumno aprendería mal.
