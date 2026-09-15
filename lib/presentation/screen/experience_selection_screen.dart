import 'package:flutter/material.dart';
import '../model/experience_model.dart';
import '../service/experience_service.dart';
import '../widget/app_theme.dart';
import '../widget/experience_card_widget.dart';
import '../widget/radar_logo_widget.dart';

/// Selección de Misión (Home Principal)
/// - Filtros rápidos: "Dificultad", "Tiempo"
class ExperienceSelectionScreen extends StatefulWidget {
  const ExperienceSelectionScreen({super.key});

  @override
  State<ExperienceSelectionScreen> createState() =>
      _experienceSelectionScreenState();
}

class _experienceSelectionScreenState extends State<ExperienceSelectionScreen> {
  final ExperienceService _ExperienceService = ExperienceService();

  late Future<List<ExperienceModel>> _experiencesFuture;
  late List<ExperienceFilterModel> _filters;

  @override
  void initState() {
    super.initState();
    _experiencesFuture = _ExperienceService.loadExperiences();
    _filters = _ExperienceService.loadFilters();
  }

  void _toggleFilter(ExperienceFilterModel filter) {
    setState(() => filter.isSelected = !filter.isSelected);
    // el filtrado de la lista se delega al service en una
    // futura iteración; acá solo se maneja el estado visual del chip.
  }

  void _onexperienceStart(ExperienceModel experience) {
    // La selección de una tarjeta ejecuta una transición de escala
    // expansiva que transforma la tarjeta elegida en la vista de
    // inicio del juego.
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Iniciando: ${experience.title}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.midnightViolet,
      appBar: _buildAppBar(),
      body: Column(
        children: [
          _buildFilterBar(),
          Expanded(
            child: FutureBuilder<List<ExperienceModel>>(
              future: _experiencesFuture,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.vibrantCyan),
                  );
                }
                final experiences = snapshot.data!;
                return ListView.builder(
                  padding: const EdgeInsets.only(top: 8, bottom: 24),
                  itemCount: experiences.length,
                  itemBuilder: (context, index) {
                    final experience = experiences[index];
                    return ExperienceCardWidget(
                      experience: experience,
                      onStart: () => _onexperienceStart(experience),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.midnightViolet,
      elevation: 0,
      titleSpacing: 8,
      leading: const Padding(
        padding: EdgeInsets.all(8.0),
        child: RadarLogoWidget(size: 28),
      ),
      title: const Text('Misiones Disponibles', style: AppTextStyles.appBarTitle),
      centerTitle: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.help_outline, color: AppColors.vibrantCyan),
          onPressed: () {},
        ),
      ],
    );
  }

  Widget _buildFilterBar() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final filter = _filters[index];
          return ChoiceChip(
            label: Text(filter.label),
            selected: filter.isSelected,
            onSelected: (_) => _toggleFilter(filter),
            backgroundColor: AppColors.deepViolet,
            selectedColor: AppColors.deepViolet,
            labelStyle: TextStyle(
              color: filter.isSelected
                  ? AppColors.vibrantCyan
                  : AppColors.pureWhite.withOpacity(0.8),
              fontFamily: 'Montserrat',
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
            side: BorderSide(
              color: filter.isSelected
                  ? AppColors.vibrantCyan
                  : AppColors.pureWhite.withOpacity(0.15),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
          );
        },
      ),
    );
  }
}
