# ZAVIC v2: corrección canónica y perfil integrado

## Objetivo

Corregir la convención de respuesta de ZAVIC para que `4` represente la
alternativa más importante y `1` la menos importante, conservar la lectura
correcta de resultados históricos y reemplazar los dos gráficos actuales por
una única vista integrada de las ocho dimensiones.

## Diseño aprobado

### Corrección y versionado

- Los nuevos resultados se guardarán como versión `2.0`.
- En la versión `2.0`, la primera alternativa seleccionada recibirá `4`, la
  segunda `3`, la tercera `2` y la última `1`.
- El puntaje de cada dimensión seguirá siendo la suma directa de sus diez
  respuestas. Por tanto, `40` representa mayor preferencia y `10` menor
  preferencia.
- Los resultados `1.0` se normalizarán al leerlos. Como la versión anterior
  usaba la convención opuesta, el puntaje canónico será `50 - puntaje_v1`.
- No se reescribirán registros históricos en la base de datos.

### Presentación integrada

- La tarjeta ZAVIC mostrará un solo gráfico con escala común de `0` a `40`.
- El eje horizontal presentará, en orden:
  `Moral`, `Legalidad`, `Indiferencia`, `Corrupción`, `Económico`, `Político`,
  `Social` y `Religioso`.
- Una división visual separará Valores de Intereses sin romper la comparación.
- Los colores identificarán el grupo psicométrico, no una evaluación
  positiva/negativa.
- Se mostrarán el mayor puntaje de Valores y el mayor puntaje de Intereses como
  síntesis descriptiva.
- Se conservarán las descripciones interactivas por dimensión y los indicadores
  de integridad.
- Se eliminarán las categorías `Predominante`, `Significativo`, `Promedio` y
  `Bajo`, porque no existe una fuente normativa local que respalde esos cortes.

## Compatibilidad

- La forma del JSON continuará incluyendo `respuestas`, `resultado`,
  `metadata` y `version`.
- La vista administrativa aceptará versiones `1.0` y `2.0`.
- Cualquier resultado sin versión explícita se tratará conservadoramente como
  `1.0`, por ser el único formato histórico conocido.
- El adaptador de lectura será la única fuente para convertir puntajes antes de
  presentarlos.

## Verificación

- Confirmar que el mapeo de las 20 preguntas no cambia.
- Verificar que cada sección suma `100`.
- Verificar extremos: preferencia máxima sostenida produce `40` y mínima `10`.
- Verificar equivalencia visual entre un resultado `1.0` normalizado y el mismo
  patrón contestado en `2.0`.
- Verificar empates en los mayores puntajes.
- Verificar gráfico y textos en escritorio y ancho móvil.
- Ejecutar el self-test ZAVIC, ESLint dirigido a los archivos modificados y el
  build de producción.

## Plan de implementación

1. Ampliar los tipos ZAVIC para aceptar las versiones `1.0` y `2.0`.
2. Incorporar un adaptador puro de puntajes históricos a la escala canónica.
3. Cambiar las instrucciones y asignación secuencial del cuestionario.
4. Actualizar los self-tests de corrección y compatibilidad.
5. Sustituir el gráfico dividido por un gráfico integrado y responsivo.
6. Actualizar la tarjeta de resultado con síntesis y notas de lectura.
7. Verificar lógica, lint, compilación y presentación visual.
