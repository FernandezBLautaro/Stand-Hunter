import 'package:flutter/material.dart';
import '../model/experience_model.dart';
import 'app_theme.dart';

/// widget/experience_card_widget.dart
///
/// Tarjeta de desafío usada en la lista vertical de "Selección de
/// Misión": bordes redondeados de 16dp, imagen de fondo de 120dp de
/// alto, título, duración y un botón flotante "Iniciar Desafío" en
/// Magenta Eléctrico.
class ExperienceCardWidget extends StatelessWidget {
  final ExperienceModel experience;
  final VoidCallback onStart;

  const ExperienceCardWidget({
    super.key,
    required this.experience,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.deepViolet,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.vibrantCyan.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: AppColors.purpleAccent.withOpacity(0.25),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              SizedBox(
                height: 120,
                width: double.infinity,
                child: Image.network(
                  experience.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppColors.midnightViolet,
                    child: const Icon(
                      Icons.image_not_supported,
                      color: AppColors.vibrantCyan,
                    ),
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        experience.title,
                        style: AppTextStyles.h2.copyWith(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.timer_outlined,
                              size: 14, color: AppColors.vibrantCyan),
                          const SizedBox(width: 4),
                          Text(experience.duration,
                              style: AppTextStyles.caption
                                  .copyWith(color: AppColors.vibrantCyan)),
                          const SizedBox(width: 10),
                          Text(experience.difficulty,
                              style: AppTextStyles.caption),
                        ],
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: onStart,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.electricMagenta,
                    foregroundColor: AppColors.pureWhite,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  child: const Text('Iniciar Desafío',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;
  const _Tag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.darkViolet.withOpacity(0.8),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.vibrantCyan.withOpacity(0.5)),
      ),
      child: Text(
        text,
        style: AppTextStyles.caption.copyWith(fontSize: 10),
      ),
    );
  }
}
