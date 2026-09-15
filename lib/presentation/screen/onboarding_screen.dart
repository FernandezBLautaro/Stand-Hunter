import 'package:flutter/material.dart';
import '../model/onboarding_slide_model.dart';
import '../service/onboarding_service.dart';
import '../widget/app_theme.dart';
import '../widget/page_indicator_widget.dart';
import '../widget/primary_button_widget.dart';
import 'experience_selection_screen.dart';

/// Onboarding y Permisos Básicos 
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  /// 3 diapositivas horizontales
  final OnboardingService _onboardingService = OnboardingService();
  final CameraPermissionService _cameraService = CameraPermissionService();
  final PageController _pageController = PageController();

  late Future<List<OnboardingSlideModel>> _slidesFuture;
  int _currentIndex = 0;
  bool _requestingCamera = false;

  @override
  void initState() {
    super.initState();
    _slidesFuture = _onboardingService.loadSlides();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goToMissionSelection() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const ExperienceSelectionScreen()),
    );
  }

  Future<void> _handleGrantCamera() async {
    setState(() => _requestingCamera = true);
    final granted = await _cameraService.requestCameraAccess();
    if (!mounted) return;
    setState(() => _requestingCamera = false);
    if (granted) {
      // "Una vez otorgado, salta automáticamente al menú principal."
      _goToMissionSelection();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.midnightViolet,
      body: SafeArea(
        child: FutureBuilder<List<OnboardingSlideModel>>(
          future: _slidesFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const Center(
                child: CircularProgressIndicator(color: AppColors.vibrantCyan),
              );
            }

            final slides = snapshot.data!;

            return Column(
              children: [
                // Enlace "Omitir".
                Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8, top: 4),
                    child: SecondaryTextButtonWidget(
                      label: 'Omitir',
                      color: AppColors.pureWhite.withOpacity(0.7),
                      onPressed: _goToMissionSelection,
                    ),
                  ),
                ),
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: slides.length,
                    onPageChanged: (index) =>
                        setState(() => _currentIndex = index),
                    itemBuilder: (context, index) {
                      return _OnboardingSlide(slide: slides[index]);
                    },
                  ),
                ),
                PageIndicatorWidget(
                  count: slides.length,
                  currentIndex: _currentIndex,
                ),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: _buildBottomAction(slides),
                ),
                const SizedBox(height: 32),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildBottomAction(List<OnboardingSlideModel> slides) {
    final isLastSlide = _currentIndex == slides.length - 1;
    final isPermissionSlide = slides[_currentIndex].isPermissionSlide;

    if (isPermissionSlide) {
      return Column(
        children: [
          PrimaryButtonWidget(
            label: _requestingCamera
                ? 'Solicitando acceso...'
                : 'Conceder acceso a Cámara',
            backgroundColor: AppColors.electricMagenta,
            height: 56,
            fullWidth: true,
            icon: Icons.camera_alt_outlined,
            onPressed: _requestingCamera ? () {} : _handleGrantCamera,
          ),
          const SizedBox(height: 8),
          SecondaryTextButtonWidget(
            label: 'Decidir luego',
            color: AppColors.pureWhite.withOpacity(0.7),
            onPressed: _goToMissionSelection,
          ),
        ],
      );
    }

    return PrimaryButtonWidget(
      label: 'Siguiente',
      backgroundColor: AppColors.vibrantCyan,
      height: 48,
      fullWidth: true,
      onPressed: () {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      },
    );
  }
}

class _OnboardingSlide extends StatelessWidget {
  final OnboardingSlideModel slide;
  const _OnboardingSlide({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Placeholder de la "Ilustración Central".
          Container(
            height: 220,
            width: 220,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.vibrantCyan.withOpacity(0.18),
                  AppColors.vibrantCyan.withOpacity(0.0),
                ],
              ),
            ),
            child: Icon(
              IconData(slide.iconCodePoint, fontFamily: 'MaterialIcons'),
              size: 90,
              color: AppColors.vibrantCyan,
            ),
          ),
          const SizedBox(height: 36),
          Text(slide.title, textAlign: TextAlign.center, style: AppTextStyles.h1),
          const SizedBox(height: 12),
          Text(slide.subtitle, textAlign: TextAlign.center, style: AppTextStyles.h2),
        ],
      ),
    );
  }
}
