# Mochimo Wallet
**Pre-built Android releases are available on [GitHub Releases](https://github.com/NickP005/mochiwallet/releases).**

A browser extension wallet and Android mobile app for the Mochimo cryptocurrency.

## Prerequisites

- Node.js >= 16.x and npm
- [Capacitor CLI](https://capacitorjs.com/docs/getting-started):  
  ```sh
  npm install -g @capacitor/cli
  ```
- Android Studio (for Android build)
- Java Development Kit (JDK)

## Initial Setup

All dependencies are installed automatically. To start from scratch:

```sh
# Clone the repository
git clone https://github.com/NickP005/mochiwallet.git
cd mochiwallet

# Install dependencies
npm install

# Complete Android setup (configure Capacitor, etc.)
npm run setup:android
```

### Android Development Setup

Make sure your development environment meets these requirements:

1. Install Android Studio from the [official website](https://developer.android.com/studio)
   
2. Install the Android SDK through Android Studio:
   - Open Android Studio > Settings/Preferences > Appearance & Behavior > System Settings > Android SDK
   - Make sure you have installed:
     - Android SDK Platform
     - Android SDK Build-Tools
     - Android SDK Command-line Tools
     - Android SDK Platform-Tools

3. Set up environment variables:
   ```sh
   # For macOS/Linux
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/emulator
   ```
   
4. Make sure you have JDK installed:
   ```sh
   java -version
   ```

## Install dependencies

```sh
npm install
```

## Main Commands

| Command               | Description                                                             |
|-----------------------|-------------------------------------------------------------------------|
| `npm run dev`         | Start local development environment                                     |
| `npm run build:web`   | Build the webapp in `dist/web`                                          |
| `npm run preview`     | Serve the real web build from `dist/web`                                |
| `npm run setup:android` | Complete Android environment setup (run once)                         |
| `npm run build:android` | Build webapp, sync Capacitor, and create Android APK                   |
| `npm run run:android`   | Launch emulator, build & install the app on selected AVD                     |
| `npm run dist:android` | Create optimized build for Google Play Store                           |

## Android Build (Capacitor)

### Android Setup

If you clone the repository for the first time, run the complete setup:

```sh
npm run setup:android
```

This command:
1. Initializes Capacitor if not present
2. Adds the Android platform
3. Configures the Android project for automated builds
4. Syncs web assets

### Build and Test Android

#### Local development

```sh
npm run build:android
```

This command:
- Builds the webapp in web mode
- Syncs Capacitor with updated web files
- Builds the Android APK
- The APK can be found in `android/app/build/outputs/apk/debug/app-debug.apk`

#### Fast build during development

```sh
npm run build:web && npx cap sync android
```

If Android Studio is already open, this command only updates the web files.

#### Distribution build (Google Play)

```sh
npm run dist:android
```

This command:
- Creates an optimized build
- Configures the project for release
- Creates a signed bundle for Google Play Store submission

### Troubleshooting

- **Gradle errors:**
  ```sh
  cd android && ./gradlew clean && cd ..
  ```

- **JDK version issues:**
  Make sure you have the correct JDK version installed and configured in your PATH

- **Android SDK not found:**
  Verify your ANDROID_HOME environment variable is set correctly

- **Emulator not starting:**
  ```sh
  $ANDROID_HOME/emulator/emulator -avd <avd_name> -netdelay none -netspeed full
  ```

### Important notes

- **No Google account needed** for local/emulator testing
- **Publishing requires** a Google Play Developer account
- **If you change web code**, rerun `npm run build:android`
- **Android icons** should be updated in `android/app/src/main/res/mipmap-*/`
- **The android folder is gitignored** except for icon resources and manifest

## Configuration

The project includes:
- **Capacitor config**: `capacitor.config.ts`
- **App ID**: `com.mochimo.androidwallet`
- **App Name**: `Mochimo Wallet`
- **Web directory**: `dist`

## CI/CD with GitHub Actions

The project is ready for automation via GitHub Actions:

### Automatic Android Build

The CI/CD pipeline for Android:
1. Triggers on push to the `android` branch
2. Installs all required dependencies (including Android SDK)
3. Builds the webapp and syncs with Capacitor
4. Builds Android APK in Ubuntu environment
5. Uploads artifacts for testing

### Google Play Release

To release to Google Play:
1. Create a tag with the format `android-v*` (e.g. `android-v1.0.0`)
2. The pipeline automatically creates a signed build
3. The build is attached to the GitHub Release
4. You can download the APK from GitHub Releases or upload it to Google Play Console

## Project Structure

```
mochiwallet/
├── src/                    # Webapp source
├── dist/                   # Build output
├── android/                # Native Android project (gitignored)
│   └── app/src/main/res/mipmap-*/ # Icons (tracked)
├── .github/workflows/      # GitHub Actions CI/CD
├── capacitor.config.ts     # Capacitor configuration
└── package.json           # Dependencies and scripts
```

## License

See [LICENSE](LICENSE.md) for details.