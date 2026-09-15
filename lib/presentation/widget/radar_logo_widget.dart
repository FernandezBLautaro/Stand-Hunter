import 'package:flutter/material.dart';
import 'app_theme.dart';

/// Splash.
class RadarLogoWidget extends StatelessWidget {
  final double size;

  const RadarLogoWidget({super.key, this.size = 140});

  /// Etiqueta de accesibilidad definida en el diseño.
  static const String semanticLabel =
      'Logo animado de Stand Hunter, detector de desafíos interactivos';

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: true,
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(painter: _RadarLogoPainter()),
      ),
    );
  }
}

class _RadarLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // El SVG original usa un viewBox de 140x140, escalamos proporcionalmente.
    final scale = size.width / 140;
    canvas.save();
    canvas.scale(scale, scale);

    final center = const Offset(70, 70);

    // --- Glow de fondo ---
    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          AppColors.vibrantCyan.withOpacity(0.35),
          AppColors.vibrantCyan.withOpacity(0.0),
        ],
        stops: const [0.0, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: 62));
    canvas.drawCircle(center, 62, glowPaint);

    // --- Anillo exterior punteado ---
    _drawDashedCircle(
      canvas,
      center,
      58,
      Paint()
        ..color = AppColors.vibrantCyan.withOpacity(0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    // --- Brackets de esquina (estilo "target") ---
    final bracketPaint = Paint()
      ..color = AppColors.vibrantCyan
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.5);

    _drawBracket(canvas, bracketPaint, const Offset(30, 50),
        const Offset(30, 30), const Offset(50, 30));
    _drawBracket(canvas, bracketPaint, const Offset(110, 50),
        const Offset(110, 30), const Offset(90, 30));
    _drawBracket(canvas, bracketPaint, const Offset(30, 90),
        const Offset(30, 110), const Offset(50, 110));
    _drawBracket(canvas, bracketPaint, const Offset(110, 90),
        const Offset(110, 110), const Offset(90, 110));

    // --- Anillo HUD medio ---
    canvas.drawCircle(
      center,
      38,
      Paint()
        ..shader = const LinearGradient(
          colors: [AppColors.vibrantCyan, AppColors.purpleAccent],
        ).createShader(Rect.fromCircle(center: center, radius: 38))
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    _drawDashedCircle(
      canvas,
      center,
      22,
      Paint()
        ..color = AppColors.electricMagenta.withOpacity(0.9)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
      dashLength: 4,
      gapLength: 4,
    );

    // --- Núcleo central / retícula ---
    canvas.drawCircle(
      center,
      7,
      Paint()
        ..color = AppColors.vibrantCyan
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
    );
    canvas.drawCircle(center, 3, Paint()..color = AppColors.pureWhite);

    // --- Crosshairs ---
    final crossPaint = Paint()
      ..color = AppColors.vibrantCyan
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(70, 18), const Offset(70, 34), crossPaint);
    canvas.drawLine(const Offset(70, 106), const Offset(70, 122), crossPaint);
    canvas.drawLine(const Offset(18, 70), const Offset(34, 70), crossPaint);
    canvas.drawLine(const Offset(106, 70), const Offset(122, 70), crossPaint);

    // --- Acento de "barrido" del escáner ---
    final sweepPath = Path()
      ..moveTo(70, 70)
      ..lineTo(98, 42)
      ..lineTo(98, 58)
      ..close();
    canvas.drawPath(
      sweepPath,
      Paint()..color = AppColors.vibrantCyan.withOpacity(0.25),
    );

    canvas.restore();
  }

  void _drawBracket(Canvas canvas, Paint paint, Offset p1, Offset p2, Offset p3) {
    final path = Path()
      ..moveTo(p1.dx, p1.dy)
      ..lineTo(p2.dx, p2.dy)
      ..lineTo(p3.dx, p3.dy);
    canvas.drawPath(path, paint);
  }

  void _drawDashedCircle(
    Canvas canvas,
    Offset center,
    double radius,
    Paint paint, {
    double dashLength = 6,
    double gapLength = 4,
  }) {
    final circumference = 2 * 3.141592653589793 * radius;
    final dashCount = (circumference / (dashLength + gapLength)).floor();
    final dashAngle = (dashLength / radius);
    final gapAngle = (gapLength / radius);

    double currentAngle = 0;
    for (int i = 0; i < dashCount; i++) {
      final path = Path()
        ..addArc(
          Rect.fromCircle(center: center, radius: radius),
          currentAngle,
          dashAngle,
        );
      canvas.drawPath(path, paint);
      currentAngle += dashAngle + gapAngle;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
