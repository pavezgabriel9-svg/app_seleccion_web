# IC: conservación de respuestas al vencer el tiempo

## Objetivo

Evitar que el vencimiento del cronómetro califique la prueba IC como si no tuviera respuestas y asegurar que el resultado quede registrado sin requerir una acción adicional del candidato.

## Diseño aprobado

- Mantener una referencia (`answersRef`) con la última matriz de respuestas junto al estado usado para renderizar la tabla.
- Actualizar ambos valores en cada cambio de casilla.
- Calcular el resultado de IC a partir de la referencia, para que el temporizador no dependa de una función que haya capturado un estado anterior.
- Diferenciar el envío manual del vencimiento: el envío manual conserva la pantalla de confirmación; al expirar, se entrega el resultado inmediatamente a `onComplete`, que lo persiste y redirige al hub.

## Manejo de errores y verificación

- Se mantendrá el bloqueo contra doble envío ya existente en la acción del servidor.
- Se verificará el tipado y las reglas de lint tras el cambio.
- La prueba manual debe comprobar que, tras varias selecciones, el vencimiento persiste esas selecciones y no una matriz vacía.
