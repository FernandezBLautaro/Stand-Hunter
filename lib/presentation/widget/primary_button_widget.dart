import 'package:flutter/material.dart';
import 'app_theme.dart';

class PrimaryButtonWidget extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final Color backgroundColor;
  final double height;
  final bool fullWidth;
  final IconData? icon;

  const PrimaryButtonWidget({
    super.key,
    required this.label,
    required this.onPressed,
    this.backgroundColor = AppColors.vibrantCyan,
    this.height = 48,
    this.fullWidth = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final button = SizedBox(
      height: height,
      width: fullWidth ? double.infinity : null,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor,
          foregroundColor: AppColors.darkViolet,
          elevation: 6,
          shadowColor: backgroundColor.withOpacity(0.6),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(height / 2),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 20),
              const SizedBox(width: 8),
            ],
            Text(label, style: AppTextStyles.buttonLabel),
          ],
        ),
      ),
    );
    return button;
  }
}


class SecondaryTextButtonWidget extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final Color color;

  const SecondaryTextButtonWidget({
    super.key,
    required this.label,
    required this.onPressed,
    this.color = AppColors.pureWhite,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      child: Text(
        label,
        style: AppTextStyles.buttonLabel.copyWith(color: color),
      ),
    );
  }
}
