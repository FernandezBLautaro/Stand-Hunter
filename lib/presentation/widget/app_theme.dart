import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color midnightViolet = Color(0xFF160B2E); // Violeta Medianoche
  static const Color deepViolet = Color(0xFF1E0F3D); // Violeta Profundo
  static const Color darkViolet = Color(0xFF0D0620); // Violeta Oscuro
  static const Color electricMagenta = Color(0xFFFF007F); // Magenta Eléctrico
  static const Color vibrantCyan = Color(0xFF00F0FF); // Cian Vibrante
  static const Color purpleAccent = Color(0xFF7000FF);
  static const Color pureWhite = Color(0xFFFFFFFF);

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomRight,
    colors: [midnightViolet, darkViolet, electricMagenta],
    stops: [0.0, 0.65, 1.15],
  );
}

class AppTextStyles {
  AppTextStyles._();

  static const TextStyle h1 = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.vibrantCyan,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: 'Roboto',
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: AppColors.pureWhite,
    height: 1.4,
  );

  static const TextStyle caption = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.pureWhite,
  );

  static const TextStyle appBarTitle = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.pureWhite,
  );

  static const TextStyle buttonLabel = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: FontWeight.w600,
  );
}
