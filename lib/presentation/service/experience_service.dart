import '../model/experience_model.dart';

/// Lógica de carga de datos para la pantalla "Selección de Misión".
class ExperienceService {
  Future<List<ExperienceModel>> loadExperiences() async {
    await Future.delayed(const Duration(milliseconds: 300));

    return const [
      ExperienceModel(
        id: 'm1',
        title: 'El Cuadro Oculto',
        imageUrl:
            'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600',
        duration: '10 min',
        difficulty: 'Fácil',
      ),
      ExperienceModel(
        id: 'm2',
        title: 'Código en las Sombras',
        imageUrl:
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
        duration: '15 min',
        difficulty: 'Media',
      ),
      ExperienceModel(
        id: 'm3',
        title: 'El Objeto Perdido',
        imageUrl:
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
        duration: '8 min',
        difficulty: 'Difícil',
      ),
      ExperienceModel(
        id: 'm4',
        title: 'Frecuencia Desconocida',
        imageUrl:
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
        duration: '12 min',
        difficulty: 'Media',
      ),
    ];
  }
  
  List<ExperienceFilterModel> loadFilters() {
    return [
      ExperienceFilterModel(label: 'Dificultad'),
      ExperienceFilterModel(label: 'Tiempo'),
    ];
  }
}
