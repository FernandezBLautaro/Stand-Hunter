import 'package:flutter/material.dart';
import '../model/onboarding_slide_model.dart';

/// Encapsula la lógica de carga de las diapositivas del Onboarding.
class OnboardingService {
  Future<List<OnboardingSlideModel>> loadSlides() async {
    // Simula una pequeña latencia de carga.
    await Future.delayed(const Duration(milliseconds: 200));

    return const [
      OnboardingSlideModel(
        title: 'Bienvenido al Stand',
        subtitle:
            'Explorá desafíos interactivos potenciados por Inteligencia '
            'Artificial dentro del espacio físico.',
        iconCodePoint: 0xe3af, 
      ),
      OnboardingSlideModel(
        title: 'Escaneá el Entorno',
        subtitle:
            'Tu cámara detecta objetos y códigos del stand para revelar '
            'pistas en tiempo real.',
        iconCodePoint: 0xe3b0,
      ),
      OnboardingSlideModel(
        title: 'Necesitamos tu Cámara',
        subtitle:
            'Para jugar sin descargas, Stand Hunter usa la cámara de tu '
            'navegador únicamente durante el desafío.',
        iconCodePoint: 0xe412,
        isPermissionSlide: true,
      ),
    ];
  }
}

/// Encapsula el pedido de permiso de cámara nativo del navegador/dispositivo.
class CameraPermissionService {
  Future<bool> requestCameraAccess() async {
    await Future.delayed(const Duration(milliseconds: 400));
    debugPrint('CameraPermissionService: solicitando acceso a cámara...');
    return true;
  }
}
