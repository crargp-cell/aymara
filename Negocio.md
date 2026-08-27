# Especificación completa de la lógica de negocio — Plataforma educativa de Aymara

Quiero que entiendas primero la lógica de negocio completa del sistema antes de tomar decisiones sobre su implementación. El proyecto es una **plataforma educativa para la enseñanza de Aymara enfocada en un único colegio**. No es un sistema multi-colegio ni debe diseñarse como SaaS para múltiples instituciones.

La finalidad principal es que los profesores puedan crear contenido didáctico para sus cursos y que los alumnos aprendan mediante lecciones, ejercicios, exámenes, recompensas y actividades de Realidad Aumentada. Al mismo tiempo, todo el proceso debe generar información suficiente para que posteriormente el sistema pueda realizar análisis educativos mediante estadísticas, Machine Learning y/o redes neuronales.

---

## 1. Estructura académica

La estructura general es:

**Colegio único → Gestión → Grado → Paralelo → Profesor → Alumnos → Contenido**

Existe solamente un colegio.

Dentro del colegio existen diferentes **gestiones académicas**, por ejemplo:

- Gestión 2026
- Gestión 2027
- Gestión 2028

Cada gestión contiene los grados correspondientes.

Por ejemplo:

- 1.º Secundaria
- 2.º Secundaria
- 3.º Secundaria

Cada grado puede tener diferentes paralelos:

- 1.º Secundaria A
- 1.º Secundaria B
- 1.º Secundaria C

Cada paralelo tiene **un único profesor de Aymara**, porque el sistema está enfocado exclusivamente en esta materia.

Un profesor, sin embargo, puede tener varios paralelos asignados.

Ejemplo:

**Profesor Juan**
- 1.º Secundaria A
- 2.º Secundaria B
- 3.º Secundaria A

El contenido pertenece al **paralelo**, no al profesor.

Esto es muy importante. Si un paralelo cambia de profesor, el contenido existente debe permanecer.

Ejemplo:

> 1.º Secundaria A → Profesor Juan

Juan crea 15 lecciones.

Posteriormente el administrador cambia el profesor:

> 1.º Secundaria A → Profesora María

Las 15 lecciones continúan perteneciendo a 1.º Secundaria A y María puede administrarlas.

---

# 2. Gestiones académicas

El sistema debe manejar gestiones académicas porque los alumnos, profesores y cursos pueden cambiar con el tiempo.

Una nueva gestión debe permitir realizar procesos como:

- Promoción de alumnos.
- Cambio de grado.
- Cambio de paralelo.
- Incorporación de alumnos nuevos.
- Retiro de alumnos.
- Reincorporación de alumnos.
- Conservación del historial académico.

Por ejemplo:

Un alumno está en:

> Gestión 2026 → 1.º Secundaria A

Al siguiente año puede pasar a:

> Gestión 2027 → 2.º Secundaria A

Su historial de 2026 debe conservarse.

También pueden existir excepciones:

- Un alumno nuevo ingresa al colegio.
- Un alumno abandona el colegio.
- Un alumno cambia de paralelo.
- Un alumno repite un grado.
- Un alumno se retira y posteriormente regresa.

El sistema debe permitir estos casos sin destruir su historial.

---

# 3. Regla fundamental sobre eliminación de información

**No se debe eliminar físicamente información académica importante.**

Esto aplica a:

- Alumnos.
- Profesores.
- Paralelos.
- Lecciones.
- Ejercicios.
- Exámenes.
- Tarjetas AR.
- Resultados.
- Intentos.
- Historial académico.

En lugar de eliminar información, se deben utilizar estados o eliminación lógica.

Por ejemplo:

- Activo.
- Inactivo.
- Retirado.
- Archivado.
- Deshabilitado.

El objetivo es preservar el historial para los reportes y para los análisis posteriores.

---

# 4. Administrador

El administrador representa la autoridad encargada de gestionar la institución.

Puede administrar:

- Gestiones académicas.
- Grados.
- Paralelos.
- Profesores.
- Alumnos.
- Asignaciones de profesores.
- Inscripciones.
- Promociones.
- Cambios de paralelo.
- Estados de alumnos.
- Visualización del contenido.
- Supervisión del contenido.
- Reportes y análisis.

El administrador puede entrar a un paralelo y revisar qué contenido existe.

Por ejemplo:

> Gestión 2026  
> → 1.º Secundaria  
> → 1.º Secundaria A  
> → Profesor Juan  
> → 12 lecciones  
> → 3 exámenes  
> → 8 tarjetas AR

El administrador **no crea ni edita el contenido didáctico**.

La responsabilidad de crear el material pertenece al profesor.

Sin embargo, el administrador puede supervisarlo.

Si encuentra contenido inapropiado:

> Puede desactivarlo.

Si encuentra contenido que necesita corrección:

> Puede dejar un comentario para el profesor.

El administrador no debería modificar directamente el contenido pedagógico del profesor.

---

# 5. Profesores

Un profesor solamente puede trabajar con los paralelos que tiene asignados.

Si tiene:

> 1.º A  
> 2.º B  
> 3.º A

solo debe gestionar esos paralelos.

Dentro de cada paralelo puede:

- Crear lecciones.
- Modificar lecciones.
- Crear temas.
- Subir material didáctico.
- Crear ejercicios.
- Configurar ejercicios.
- Reutilizar ejercicios.
- Crear exámenes.
- Configurar exámenes.
- Crear tarjetas AR.
- Configurar recompensas.
- Revisar resultados.
- Revisar respuestas de alumnos.
- Revisar estadísticas.
- Copiar contenido a otros paralelos que tenga asignados.

No debe poder administrar otros profesores ni alumnos que no pertenezcan a sus cursos.

---

# 6. Lecciones

Una lección representa un **nivel de aprendizaje**.

Ejemplo:

> Nivel 1 — Saludos  
> Nivel 2 — Números  
> Nivel 3 — Animales  
> Nivel 4 — Familia

Las lecciones tienen un orden.

El alumno debe completar una lección para desbloquear la siguiente.

Por ejemplo:

> Nivel 1 ✅  
> → Nivel 2 🔓

Mientras:

> Nivel 3 🔒

El alumno sí puede regresar a niveles anteriores para repasar.

El hecho de volver a una lección anterior no debe eliminar ni alterar el progreso conseguido anteriormente.

---

# 7. Contenido teórico de una lección

Cada lección tiene una parte teórica llamada tema.

El profesor puede preparar el material necesario para enseñar el contenido.

Una de las principales formas de material será un **PDF**.

El profesor puede subir el PDF y el alumno debe poder visualizarlo directamente dentro de la plataforma mediante un visor.

El objetivo es que el alumno no tenga que abandonar el sistema para consultar el material.

En el futuro se pueden contemplar otros recursos educativos, pero el PDF es una funcionalidad importante del sistema actual.

---

# 8. Ejercicios de las lecciones

Después del contenido teórico se encuentran los ejercicios.

Actualmente existen estos tipos:

1. Selección múltiple.
2. Emparejar cartas.
3. Completar la palabra.
4. Preguntas.

Los ejercicios tienen como objetivo comprobar que el alumno comprendió el contenido.

Los ejercicios **no representan una nota académica**.

Su función principal es permitir que el alumno demuestre el aprendizaje y pueda completar la lección.

---

# 9. Mínimo de ejercicios

El profesor puede crear una cantidad determinada de ejercicios para una lección y establecer cuántos debe completar correctamente el alumno.

Ejemplo:

> Lección tiene 20 ejercicios.

El profesor puede establecer:

> Mínimo requerido: 8 ejercicios correctos.

Entonces el alumno no necesita necesariamente realizar los 20 para completar el nivel.

Debe alcanzar el mínimo establecido.

También debe existir la posibilidad de trabajar con un banco mayor de ejercicios y seleccionar una cantidad para presentar al alumno.

Esto debe ser opcional porque no todos los profesores tendrán tiempo para crear grandes cantidades de ejercicios.

---

# 10. Reutilización de ejercicios

Los ejercicios pueden reutilizarse.

Un profesor puede crear un ejercicio y posteriormente utilizarlo en otra lección o actividad cuando sea pedagógicamente apropiado.

No se debe asumir que cada ejercicio solamente puede existir dentro de una única lección.

---

# 11. Dificultad

Los ejercicios deben poder tener un nivel de dificultad.

Por ejemplo:

- Fácil.
- Medio.
- Difícil.

La dificultad no solamente sirve para mostrar información al profesor.

También debe ser información útil para los análisis posteriores.

Por ejemplo, el sistema podría descubrir:

> Los alumnos tienen 90 % de aciertos en ejercicios fáciles, 70 % en medios y 40 % en difíciles.

Esto puede convertirse posteriormente en información para el análisis mediante ML.

---

# 12. Fallos y repetición de lecciones

Si un alumno no alcanza el mínimo necesario:

> La lección no se considera completada.

Pero puede volver a intentarla inmediatamente.

No debe existir una penalización por repetir una lección.

Ejemplo:

> Intento 1 → 5 correctos de 8 ❌  
> Intento 2 → 6 correctos de 8 ❌  
> Intento 3 → 8 correctos de 8 ✅

Los tres intentos deben conservarse.

---

# 13. Corrección de ejercicios

Cuando el alumno responde incorrectamente, **no se le debe mostrar inmediatamente la respuesta correcta**.

Debe saber que cometió un error, pero no recibir automáticamente la solución.

Puede continuar y posteriormente volver a intentarlo.

Esto busca evitar que simplemente memorice la respuesta correcta después de cada error.

---

# 14. Historial de intentos

Los intentos deben conservarse.

Nunca se debe sobrescribir simplemente el resultado anterior.

Ejemplo:

> Intento 1 → 45 puntos  
> Intento 2 → 72 puntos  
> Intento 3 → 91 puntos

El sistema puede mostrar:

> Mejor resultado: 91

pero internamente debe conservar:

> 45 → 72 → 91

El historial debe ser utilizado posteriormente para análisis educativos y Machine Learning.

La información histórica puede incluir:

- Alumno.
- Lección.
- Ejercicio.
- Tipo de ejercicio.
- Dificultad.
- Respuesta.
- Correcto/incorrecto.
- Tiempo.
- Fecha.
- Número de intento.
- Resultado.

---

# 15. Cambios en las lecciones

El profesor puede modificar una lección incluso después de que algunos alumnos hayan trabajado en ella.

Debe distinguirse entre cambios menores y cambios importantes.

### Cambios menores

Ejemplos:

- Corrección de texto.
- Corrección ortográfica.
- Cambio de imagen.
- Pequeña modificación de explicación.

El alumno conserva su progreso.

### Cambios importantes

Ejemplos:

- Cambiar sustancialmente los ejercicios.
- Cambiar los objetivos de la actividad.
- Modificar de forma importante la evaluación.
- Reemplazar una parte fundamental del contenido.

En estos casos, el sistema puede considerar inválido el progreso anterior relacionado con la parte modificada y pedir al alumno que vuelva a realizarla.

La finalidad es que un alumno no pueda conservar como válido un progreso obtenido sobre una actividad que posteriormente cambió de manera sustancial.

Cuando sea necesario, debe contemplarse algún mecanismo de versión o control de cambios.

---

# 16. Exámenes

Los exámenes son diferentes de las actividades normales de las lecciones.

Los ejercicios sirven principalmente para completar niveles.

Los exámenes sí generan una **evaluación académica**.

Un examen puede tener:

- Fecha de inicio.
- Fecha de finalización.
- Tiempo límite.
- Número de intentos.
- Nota mínima para aprobar.
- Tipo de examen.
- Sistema de puntuación correspondiente a ese tipo.

La puntuación no necesariamente se basa en preguntas tradicionales.

Depende de la modalidad del examen.

---

# 17. Examen de clasificación de palabras

Una modalidad de examen consiste en relacionar palabras con categorías.

El profesor debe configurar:

**Banco de palabras + categorías correspondientes.**

Ejemplo:

> Palabras:
> - anu
> - allqu
> - phisi
>
> Categorías:
> - Animales
> - Objetos
> - etc.

El alumno debe realizar las asociaciones.

El sistema calcula el resultado según las asociaciones correctas.

La puntuación debe depender de la lógica propia de este tipo de examen.

---

# 18. Examen mediante Realidad Aumentada

Existe una modalidad de examen basada en Realidad Aumentada.

Las tarjetas AR son físicas e imprimibles.

El profesor genera/proporciona:

- Una imagen PNG.
- Un archivo `.patt`.

Las tarjetas representan elementos relacionados con el aprendizaje.

Las tarjetas se obtienen como **recompensas**.

---

# 19. Tarjetas AR como recompensas

Una tarjeta puede estar asociada a una determinada lección.

Ejemplo:

> Completar Nivel 3 → desbloquea tarjeta "Llama".

El alumno obtiene la tarjeta como recompensa.

Una vez desbloqueada, permanece en su colección.

Las tarjetas también pueden estar asociadas a exámenes.

Por ejemplo, un examen AR puede utilizar tarjetas que el alumno ya tuvo la oportunidad de desbloquear mediante las lecciones anteriores.

---

# 20. Creación de exámenes AR

Cuando el profesor crea un examen AR, no debería tener que volver a crear las tarjetas.

Debe poder seleccionar tarjetas que ya existen.

El examen puede utilizar varias tarjetas y solicitar aleatoriamente cuál debe mostrar el alumno.

Ejemplo:

> "Muestra la tarjeta de la llama."

El alumno presenta la tarjeta física frente a la cámara.

El sistema comprueba si corresponde a la tarjeta solicitada y genera el resultado.

La selección debe tener un componente aleatorio.

Además, el examen debe respetar los requisitos de progresión: un alumno no debería poder realizar un examen basado en contenido que todavía no ha completado.

---

# 21. Retirada de tarjetas AR

Si el profesor decide retirar una tarjeta:

> Los nuevos alumnos ya no deben poder desbloquearla.

Pero los alumnos que ya la obtuvieron deben conservarla.

Existe una excepción:

Si un alumno recibió una tarjeta por error, debe existir la posibilidad de **revocar específicamente esa tarjeta de ese alumno**.

Por tanto:

**Desactivar tarjeta**

→ Ya no puede obtenerse.

**Revocar tarjeta de alumno**

→ Se retira específicamente de ese alumno.

Los datos históricos deben conservarse.

---

# 22. Progresión y exámenes

Las lecciones son niveles permanentes de progresión.

Los exámenes son **eventos temporales**.

El profesor puede programar un examen para determinado período.

Ejemplo:

> Examen de Unidad 3  
> Inicio: lunes 08:00  
> Fin: miércoles 23:59  
> Tiempo: 20 minutos  
> Intentos: 2  
> Aprobación: 60 %

El sistema debe comprobar los requisitos necesarios antes de permitir al alumno acceder.

---

# 23. Resultados de exámenes

Los resultados de los exámenes deben conservarse.

El alumno puede consultar:

- Puntuación.
- Aprobación o no aprobación.
- Respuestas realizadas.
- Errores.
- Tiempo utilizado.
- Resultado de cada intento.

El alumno debe poder revisar las respuestas después del examen.

El profesor debe poder consultar el detalle de las respuestas de sus alumnos.

Esto es importante tanto pedagógicamente como para los análisis posteriores.

---

# 24. Logros

Además de las tarjetas AR, el sistema puede tener logros generales.

Estos no requieren que el profesor o administrador tenga que configurarlos.

Ejemplos:

- Primera lección completada.
- Determinada cantidad de lecciones completadas.
- Mantener una determinada racha.
- Obtener buenos resultados.
- Completar cierta cantidad de exámenes.
- Desbloquear determinada cantidad de tarjetas AR.

Los logros deben generarse automáticamente según las acciones del alumno.

---

# 25. Historial y alumnos

El historial académico nunca debe depender de que el alumno continúe perteneciendo al mismo paralelo.

Por ejemplo:

Alumno:

> Gestión 2026 → 1.º A

Posteriormente:

> Gestión 2027 → 2.º A

Debe conservar:

> Historial de 1.º A + historial de 2.º A.

Si cambia de:

> 1.º A → 1.º B

también debe conservar todo su historial anterior.

Si abandona el colegio:

> Su historial permanece.

Si vuelve posteriormente:

> Su historial anterior debe seguir disponible.

Si un alumno es nuevo:

> Se incorpora al paralelo correspondiente y comienza a generar su propio historial.

---

# 26. Analítica

Todo el sistema debe generar información útil para análisis.

Debe existir una parte descriptiva que responda:

> ¿Qué ocurrió?

Por ejemplo:

- Rendimiento de alumnos.
- Rendimiento de paralelos.
- Rendimiento por lección.
- Rendimiento por ejercicio.
- Rendimiento por tipo de ejercicio.
- Rendimiento en exámenes.
- Errores frecuentes.
- Temas con mayor dificultad.
- Evolución del rendimiento.
- Tiempo empleado.
- Cantidad de intentos.

---

# 27. Machine Learning / redes neuronales

Además del análisis descriptivo, se quiere utilizar Machine Learning y/o redes neuronales para realizar análisis predictivos.

Debe responder preguntas como:

> ¿Qué podría ocurrir?

Por ejemplo:

- ¿Qué alumnos presentan riesgo de bajo rendimiento?
- ¿Qué alumnos muestran una tendencia negativa?
- ¿Qué contenidos presentan mayor dificultad?
- ¿Qué tipo de ejercicios generan más errores?
- ¿Qué alumnos podrían necesitar refuerzo?
- ¿Cómo evoluciona el rendimiento?
- ¿Qué patrones existen entre los alumnos?
- ¿Qué diferencias existen entre paralelos?
- ¿Qué contenidos deberían reforzarse?

No se debe utilizar ML simplemente por decir que el sistema tiene IA.

La información generada por el sistema debe tener una finalidad educativa concreta.

Los múltiples intentos de los alumnos son especialmente importantes porque permiten analizar la evolución del aprendizaje.

---

# 28. Información para el profesor

El profesor debe tener una visión de sus propios paralelos.

Debe poder saber:

> ¿Cómo está funcionando mi curso?

Y también:

> ¿Qué está pasando con cada alumno?

Debe poder revisar:

- Progreso.
- Lecciones completadas.
- Lecciones pendientes.
- Ejercicios.
- Errores.
- Intentos.
- Exámenes.
- Puntuaciones.
- Tiempo.
- Tarjetas desbloqueadas.
- Logros.
- Análisis.

Debe poder entrar al detalle de un alumno y también visualizar información general del paralelo.

---

# 29. Información para el administrador

El administrador debe tener una visión institucional.

Debe poder revisar:

> Colegio → Gestión → Grado → Paralelo

y desde ahí consultar:

- Profesor asignado.
- Alumnos.
- Contenido.
- Lecciones.
- Exámenes.
- Estado del contenido.
- Rendimiento.
- Estadísticas.
- Análisis.

El administrador no debe reemplazar el trabajo pedagógico del profesor.

Su función principal es:

**gestionar + supervisar + analizar.**

---

# 30. Regla sobre permisos

La separación general de responsabilidades debe ser:

### Administrador

Gestiona la institución y supervisa.

### Profesor

Crea y administra el contenido de sus paralelos.

### Alumno

Consume el contenido, realiza actividades, presenta exámenes, obtiene recompensas y genera su historial académico.

Cada usuario debe ver solamente aquello que corresponde a su rol.

---

# 31. Regla sobre el contenido

El contenido siempre debe estar relacionado con un paralelo.

Ejemplo:

> 1.º Secundaria A  
> → Lección 1  
> → Lección 2  
> → Lección 3  
> → Examen 1  
> → Tarjetas AR

No debe asumirse que todo el colegio comparte automáticamente el mismo contenido.

Un profesor puede reutilizar/copiar contenido hacia otro paralelo que también tenga asignado, pero esto debe ser una acción explícita.

---

# 32. Regla sobre el progreso

El progreso pertenece al alumno.

El profesor puede cambiar.

El paralelo puede cambiar.

La gestión puede cambiar.

Pero el historial académico del alumno debe permanecer.

Esta separación es fundamental para evitar perder información.

---

# 33. Regla sobre estados

Siempre que algo deje de estar disponible, se debe preferir:

**cambiar su estado**

en lugar de:

**eliminarlo físicamente.**

Esto debe aplicarse especialmente a información que pueda ser utilizada en reportes históricos o Machine Learning.

---

# 34. Experiencia general del alumno

La experiencia que quiero conseguir se parece conceptualmente a una plataforma como Duolingo, pero adaptada a un contexto escolar.

El flujo principal debe sentirse como:

**Entrar → ver progreso → desbloquear nivel → estudiar tema → realizar ejercicios → completar nivel → obtener recompensa → continuar → realizar exámenes → mejorar.**

Las lecciones representan niveles.

Los ejercicios representan práctica.

Los exámenes representan evaluaciones.

Las tarjetas AR representan recompensas y posteriormente pueden convertirse en herramientas para actividades evaluativas.

Los logros sirven como motivación adicional.

El historial y la analítica permiten al profesor y administrador entender el proceso de aprendizaje.

---

# 35. Ejemplo completo de funcionamiento

Supongamos:

**Gestión 2026**

**1.º Secundaria A**

**Profesor:** Juan

**Alumno:** Carlos

El profesor crea:

> Nivel 1 — Saludos

Dentro crea un tema teórico y sube un PDF.

Después crea:

- 5 ejercicios de selección múltiple.
- 5 de completar palabras.
- 5 de emparejar.
- 5 preguntas.

Total:

> 20 ejercicios.

Configura:

> Mínimo para completar: 8 correctos.

También establece diferentes dificultades.

Carlos entra.

Estudia el PDF.

Realiza los ejercicios.

Obtiene:

> 6/8 ❌

Puede intentarlo nuevamente inmediatamente.

Segundo intento:

> 8/8 ✅

Completa el Nivel 1.

Como recompensa obtiene:

> 🃏 Tarjeta AR: "Llama"

Posteriormente completa:

> Nivel 2  
> Nivel 3

y obtiene más tarjetas.

El profesor crea un examen AR.

Selecciona las tarjetas que quiere utilizar.

El examen tiene:

> 10 solicitudes aleatorias  
> Tiempo máximo: 15 minutos  
> 2 intentos  
> Nota mínima: 60 %

Carlos accede porque cumplió las lecciones requeridas.

El sistema solicita:

> "Muestra la tarjeta de la llama."

Carlos muestra la tarjeta física.

El sistema la reconoce.

Obtiene puntos.

Al terminar:

> 82/100 — Aprobado.

El sistema conserva todos los datos del examen y sus intentos.

Posteriormente el profesor puede observar:

> Carlos tiene buen rendimiento general, pero presenta dificultades recurrentes en determinados ejercicios.

El sistema también incorpora esa información a los datos utilizados por el módulo analítico.

---

# 36. Principios que NO deben romperse

Durante el desarrollo, respeta siempre estas reglas:

1. **Es un único colegio, no un sistema multi-colegio.**
2. **El sistema está enfocado exclusivamente en Aymara.**
3. **Cada paralelo tiene un único profesor de Aymara.**
4. **Un profesor puede tener varios paralelos.**
5. **El contenido pertenece al paralelo, no al profesor.**
6. **Cambiar de profesor no debe eliminar el contenido.**
7. **Los alumnos pertenecen a un paralelo activo.**
8. **Los alumnos pueden cambiar de paralelo.**
9. **Los alumnos pueden ser promovidos entre gestiones.**
10. **Los alumnos nuevos pueden incorporarse.**
11. **Los alumnos retirados conservan su historial.**
12. **No se deben eliminar físicamente datos académicos importantes.**
13. **Las lecciones son niveles de progresión.**
14. **Las lecciones deben completarse en orden.**
15. **Los alumnos pueden volver a niveles anteriores.**
16. **Los ejercicios no son exámenes ni notas académicas.**
17. **El profesor define el mínimo de ejercicios correctos necesarios.**
18. **Los ejercicios pueden reutilizarse.**
19. **Los ejercicios pueden tener dificultad.**
20. **Los intentos deben conservarse.**
21. **El historial de intentos es importante para ML.**
22. **Los errores no deben revelar automáticamente la respuesta correcta.**
23. **Los alumnos pueden volver a intentar inmediatamente.**
24. **Los cambios pequeños de contenido no deben destruir el progreso.**
25. **Los cambios importantes pueden requerir repetir la actividad afectada.**
26. **Los exámenes sí generan evaluación académica.**
27. **Los exámenes tienen su propia lógica de puntuación según su modalidad.**
28. **Los exámenes pueden tener tiempo, fechas, intentos y nota mínima.**
29. **Las tarjetas AR son recompensas.**
30. **Las tarjetas AR se generan mediante PNG + `.patt`.**
31. **Las tarjetas retiradas no pueden obtenerse nuevamente, pero quienes ya las tienen las conservan.**
32. **Una tarjeta puede revocarse específicamente de un alumno si fue obtenida por error.**
33. **Los exámenes AR deben utilizar tarjetas disponibles y respetar la progresión del alumno.**
34. **Los logros generales son automáticos y no necesitan configuración manual.**
35. **El administrador supervisa, pero no crea ni edita contenido pedagógico.**
36. **El profesor solamente gestiona sus propios paralelos.**
37. **El alumno solamente accede al contenido que le corresponde.**
38. **El análisis debe ser tanto descriptivo como predictivo.**
39. **El ML debe tener una finalidad educativa real.**
40. **La conservación del historial es prioritaria.**

Quiero que utilices esta lógica de negocio como referencia principal antes de tomar decisiones sobre el sistema. Si alguna decisión de implementación entra en conflicto con estas reglas, debe priorizarse la lógica de negocio descrita aquí.