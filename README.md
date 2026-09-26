# RPG Medieval de Supervivencia Móvil

Videojuego de supervivencia y acción RPG móvil basado en el Documento de Diseño de Juego (GDD v1.0).

## 🚀 Inicio Rápido

Para ejecutar el juego localmente:

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm run dev
```

O para compilar y servir la versión optimizada de producción:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm run build
npm run preview
```

El servidor estará disponible en `http://localhost:4173/` o en tu navegador móvil dentro de la misma red Wi-Fi.

## 🌟 Características Implementadas
1. **Prólogo del Naufragio**: Despertar en la costa con hipotermia, recolección de leña, encendido de fogata y enigma de la Roca Ancestral.
2. **7 Grandes Regiones Autónomas**:
   - Orilla del Naufragio (Tutorial)
   - La Meseta Helada de la Escarcha (Tundra / Alta Montaña)
   - La Taiga Ancestral (Bosque Profundo)
   - La Ciénaga Negruzca (Pantano Venenoso)
   - El Cañón de las Cenizas (Estepa Árida y Yermos)
   - El Abismo Subterráneo (Cavernas de Penumbra)
   - El Núcleo del Impacto (Arena del Clímax Extraterrestre)
3. **Puntos de Transición (Chokepoints)**: Pantallas de carga inmersivas de 2.5s con folclore local y consejos para optimizar la memoria en dispositivos móviles.
4. **Sistema de Afinidad y Habilidades Tribales**:
   - 5 Tribus autóctonas con diálogos, pruebas de iniciación y tributos.
   - 5 Habilidades únicas (Corazón de Escarcha, Zancada de Canopia, Adaptación a Toxinas, Resistencia de Camélido, Agarre Férreo y Visión Espectral).
   - Límite estricto de 3 ranuras rúnicas sintonizables únicamente en fogatas o tótems.
5. **Objetos Especiales Efímeros y Ventana de Sacrificio Anti-Exploit**:
   - Almacenamiento inerte en el Relicario.
   - Temporizador activo al equipar en el marco rúnico del HUD.
   - Ventana crítica de 8-10 segundos con anillo carmesí para autodestrucción instantánea de potencia masiva.
   - Bloqueo sonoro rúnico definitivo tras 10 segundos.
6. **Jefe Final: El Heraldo de las Estrellas**:
   - 4 fases dinámicas de alteración climática (Criogénica, Miasma Tóxico, Térmica Volcánica, Penumbra Gravitacional).
   - Escudos deflectores y vulnerabilidad al sacrificio de artefactos efímeros.
   - Finales ramificados: Desmantelar tecnología vs Integrar biotecnología.
7. **Diseño Sonoro Procedural**: Sintetizador Web Audio API para música ambiental por bioma, sonido de tormentas, pisadas, fogatas, combate, latido rúnico y detonación.
