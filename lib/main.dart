import 'package:flutter/material.dart';
import 'presentation/screen/splash_screen.dart';
import 'presentation/widget/app_theme.dart';

void main() {
  runApp(const StandHunterApp());
}

class StandHunterApp extends StatelessWidget {
  const StandHunterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Stand Hunter',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.midnightViolet,
        colorScheme: ColorScheme.dark(
          primary: AppColors.vibrantCyan,
          secondary: AppColors.electricMagenta,
          surface: AppColors.deepViolet,
        ),
        fontFamily: 'Roboto',
      ),
      home: const SplashScreen(),
    );
  }
}
