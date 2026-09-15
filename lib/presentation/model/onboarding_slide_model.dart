/// Representa una diapositiva del carrusel de Onboarding (Vista 2).
/// Es un modelo de negocio puro: no sabe nada de widgets ni de UI.
class OnboardingSlideModel {
  final String title;
  final String subtitle;
  final int iconCodePoint;
  /// Indica si esta es la última diapositiva, la de permisos de cámara.
  final bool isPermissionSlide;

  const OnboardingSlideModel({
    required this.title,
    required this.subtitle,
    required this.iconCodePoint,
    this.isPermissionSlide = false,
  });

  factory OnboardingSlideModel.fromJson(Map<String, dynamic> json) {
    return OnboardingSlideModel(
      title: json['title'] as String,
      subtitle: json['subtitle'] as String,
      iconCodePoint: json['iconCodePoint'] as int,
      isPermissionSlide: json['isPermissionSlide'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'subtitle': subtitle,
        'iconCodePoint': iconCodePoint,
        'isPermissionSlide': isPermissionSlide,
      };
}
