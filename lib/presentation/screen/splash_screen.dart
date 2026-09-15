import 'dart:async';

import 'package:flutter/material.dart';
import '../widget/app_theme.dart';
import '../widget/radar_logo_widget.dart';
import 'onboarding_screen.dart';

/// Splash (Pantalla Inicial de Carga)
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _navigationTimer;

  @override
  void initState() {
    super.initState();
    _scheduleNavigation();
  }

  @override
  void dispose() {
    _navigationTimer?.cancel();
    super.dispose();
  }

  void _scheduleNavigation() {
    // Permanencia fija de 5 segundos mientras se inicializan los sensores del navegador o cambian los estados de conexión locales.
    _navigationTimer = Timer(const Duration(milliseconds: 5000), () {
      if (!mounted) return;

      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 500),
          pageBuilder: (_, animation, __) => const OnboardingScreen(),
          // Transición fluida mediante desvanecimiento cruzado.
          transitionsBuilder: (_, animation, __, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(flex: 3),
              const RadarLogoWidget(size: 140),
              const Spacer(flex: 2),
              const Text(
                'Stand Hunter',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.pureWhite,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Laboratorio de Experiencias Interactivas',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 12,
                  color: AppColors.pureWhite,
                ),
              ),
              const Spacer(flex: 3),
              // Indicador de progreso indeterminado, 4dp de alto.
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 40),
                child: SizedBox(
                  height: 4,
                  child: ClipRRect(
                    borderRadius: BorderRadius.all(Radius.circular(2)),
                    child: LinearProgressIndicator(
                      backgroundColor: Color(0x33FFFFFF),
                      valueColor:
                          AlwaysStoppedAnimation<Color>(AppColors.vibrantCyan),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
