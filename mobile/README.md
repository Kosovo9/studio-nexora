# 📱 Studio Nexora - Flutter Mobile App

Cross-platform mobile application for iOS and Android.

## 🚀 Features

- ✅ Native mobile experience
- ✅ Camera integration
- ✅ Gallery access
- ✅ Real-time image processing
- ✅ Push notifications
- ✅ Offline support
- ✅ Biometric authentication
- ✅ In-app purchases

## 📋 Prerequisites

- Flutter SDK 3.16+
- Dart 3.2+
- Android Studio / Xcode
- CocoaPods (for iOS)

## 🛠️ Setup

```bash
# Navigate to mobile directory
cd mobile

# Get dependencies
flutter pub get

# Run on iOS
flutter run -d ios

# Run on Android
flutter run -d android

# Build for production
flutter build apk --release  # Android
flutter build ios --release  # iOS
```

## 📁 Project Structure

```
mobile/
├── lib/
│   ├── main.dart              # App entry point
│   ├── config/                # Configuration
│   ├── models/                # Data models
│   ├── services/              # API services
│   ├── providers/             # State management
│   ├── screens/               # UI screens
│   ├── widgets/               # Reusable widgets
│   └── utils/                 # Utilities
├── android/                   # Android config
├── ios/                       # iOS config
├── assets/                    # Images, fonts
└── pubspec.yaml              # Dependencies
```

## 🔧 Configuration

### API Endpoint
Edit `lib/config/api_config.dart`:
```dart
const String API_BASE_URL = 'https://your-domain.com/api';
```

### Environment Variables
Create `.env` file:
```
API_URL=https://your-domain.com
CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📦 Dependencies

- **flutter_bloc** - State management
- **dio** - HTTP client
- **image_picker** - Camera/Gallery
- **cached_network_image** - Image caching
- **flutter_secure_storage** - Secure storage
- **local_auth** - Biometric auth
- **firebase_messaging** - Push notifications
- **in_app_purchase** - Payments

## 🎨 Theming

The app uses Material Design 3 with custom theming matching the web app.

## 🔐 Authentication

Integrated with Clerk for seamless authentication across platforms.

## 💳 Payments

Supports:
- Stripe (iOS/Android)
- Google Play Billing (Android)
- Apple Pay (iOS)

## 📱 Platform-Specific Features

### iOS
- Face ID / Touch ID
- Apple Pay
- iOS 13+ support

### Android
- Fingerprint / Face unlock
- Google Pay
- Android 8+ support

## 🧪 Testing

```bash
# Run tests
flutter test

# Run integration tests
flutter test integration_test

# Code coverage
flutter test --coverage
```

## 🚀 Deployment

### Android
```bash
flutter build appbundle --release
```
Upload to Google Play Console

### iOS
```bash
flutter build ipa --release
```
Upload to App Store Connect

## 📚 Documentation

See individual files for detailed documentation.

## 🆘 Support

- Email: mobile@studionexora.com
- Discord: [Join](https://discord.gg/studionexora)
