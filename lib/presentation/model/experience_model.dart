/// Representa un desafío/misión disponible en la pantalla "Selección de Misión"
class ExperienceModel {
  final String id;
  final String title;
  final String imageUrl;
  final String duration;
  final String difficulty; 

  const ExperienceModel({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.duration,
    required this.difficulty,
  });

  factory ExperienceModel.fromJson(Map<String, dynamic> json) {
    return ExperienceModel(
      id: json['id'] as String,
      title: json['title'] as String,
      imageUrl: json['imageUrl'] as String,
      duration: json['duration'] as String,
      difficulty: json['difficulty'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'imageUrl': imageUrl,
        'duration': duration,
        'difficulty': difficulty,
      };
}

class ExperienceFilterModel {
  final String label;
  bool isSelected;

  ExperienceFilterModel({required this.label, this.isSelected = false});
}
