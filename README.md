# Stand Hunter — Vistas 1, 2 y 3

Implementación en Flutter/Dart de las primeras 3 pantallas del documento
`Diseño_de_Pantallas.pdf`, siguiendo la arquitectura solicitada:

```
lib/
├── screen/      # Pantallas (una por vista)
│   ├── splash_screen.dart              # Vista 1 - Splash
│   ├── onboarding_screen.dart          # Vista 2 - Onboarding y Permisos
│   └── mission_selection_screen.dart   # Vista 3 - Selección de Misión
├── model/       # Datos de negocio
│   ├── onboarding_slide_model.dart
│   └── mission_model.dart
├── service/     # Lógica de carga de datos
│   ├── onboarding_service.dart         # incluye CameraPermissionService
│   └── mission_service.dart
├── widget/      # Componentes reutilizables
│   ├── app_theme.dart          # paleta de colores + tipografías
│   ├── radar_logo_widget.dart  # logo del SVG provisto, en CustomPainter
│   ├── primary_button_widget.dart
│   ├── page_indicator_widget.dart
│   └── mission_card_widget.dart
└── main.dart
```

## Flujo de navegación

`SplashScreen` (1.5s) → fade → `OnboardingScreen` (3 slides,
la última pide permiso de cámara) → `MissionSelectionScreen`
(lista de desafíos con filtros).

## Cómo correrlo

```bash
flutter pub get
flutter run -d chrome   # o el device que prefieras
```

## Notas de fidelidad al diseño

- Colores extraídos del PDF: Violeta Medianoche, Violeta Profundo,
  Violeta Oscuro, Magenta Eléctrico y Cian Vibrante, centralizados en
  `widget/app_theme.dart`.
- El logo del Splash está dibujado a mano con `CustomPainter`
  replicando el `code.html` (SVG) que compartiste, para que sea
  100% nativo y no dependa de un asset SVG externo.
- Las imágenes de las tarjetas de misión usan URLs de placeholder
  (Unsplash); reemplazalas por los assets reales del stand cuando
  los tengas.
- `CameraPermissionService.requestCameraAccess()` está abstraído:
  hoy simula el permiso, pero podés conectarlo a `permission_handler`
  o `camera` sin tocar `OnboardingScreen`.
