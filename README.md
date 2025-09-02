# Mochimo Wallet
**Pre-built iOS releases are available on [GitHub Releases](https://github.com/NickP005/mochiwallet/releases).**

A browser extension wallet and mobile app for the Mochimo cryptocurrency.

## Prerequisites

- Node.js >= 16.x and npm
- [Capacitor CLI](https://capacitorjs.com/docs/getting-started):  
  ```sh
  npm install -g @capacitor/cli
  ```
- Xcode (for iOS build)
- Android Studio (for Android build)
- CocoaPods (for native iOS dependencies)

## Initial Setup

All dependencies are installed automatically. To start from scratch:

```sh
# Clone the repository
git clone https://github.com/NickP005/mochiwallet.git
cd mochiwallet

# Install dependencies
npm install

# Complete iOS environment setup (installs CocoaPods, configures Capacitor, etc.)
npm run setup:ios  # This script is provided in scripts/setup-ios.ts
```

### Manual CocoaPods installation (if needed)

If automatic setup fails, you can install CocoaPods manually:

1. Install Ruby with Homebrew:
   ```sh
   brew install ruby
   ```
   
2. Add Ruby from Homebrew to your PATH:
   ```sh
   echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
   echo 'export PATH="/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ruby --version   # Should be at least 3.1.x
   ```
   > Replace `3.4.0` with your installed version (check with `ls /opt/homebrew/lib/ruby/gems/`)

3. Install CocoaPods:
   ```sh
   gem install cocoapods
   pod --version
   ```

## Install dependencies

```sh
npm install
```

## Main Commands

| Command              | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `npm run dev`        | Start local development environment                                         |
| `npm run build:web`  | Build the webapp in `dist/web`                                              |
| `npm run preview`    | Serve the real web build from `dist/web`                                    |
| `npm run setup:ios`  | Complete iOS environment setup (run once)                                   |
| `npm run build:ios`  | Build webapp, sync Capacitor, open and build in Xcode automatically         |
| `npm run dist:ios`   | Create build for App Store (requires Apple Developer account)               |

## iOS Build (Capacitor)

### iOS Setup

If you clone the repository for the first time, run the complete setup:

```sh
npm run setup:ios
```

This command:
1. Checks and installs Ruby and CocoaPods if needed
2. Initializes Capacitor if not present
3. Adds the iOS platform
4. Installs native dependencies with CocoaPods
5. Configures the Xcode project for automatic builds

### Build and Test iOS

#### Local development

```sh
npm run build:ios
```

This command:
- Builds the webapp in web mode
- Syncs Capacitor with updated web files
- Opens Xcode and automatically starts the build
- Launches the iOS simulator with the app running

#### Fast build during development

```sh
npm run build:web && npx cap sync ios
```

If Xcode is already open, this command only updates the web files.

#### Distribution build (App Store)

```sh
npm run dist:ios
```

This command:
- Creates an optimized build
- Configures the project for release
- Archives the project for TestFlight/App Store

### Troubleshooting

- **CocoaPods errors:**
  ```sh
  cd ios/App && pod install && cd ../..
  ```

- **`pod` command not found:**
  Check that Ruby and CocoaPods are in your PATH:
  ```sh
  ruby --version
  pod --version
  ```

- **Provisioning/certificate errors:**
  Check in Xcode > Signing & Capabilities

- **First Xcode setup:**
  ```sh
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  sudo xcodebuild -license
  ```

### Important notes

- **No Apple account needed** for simulator testing
- **Physical devices require** an Apple Developer account and provisioning profile
- **If you change web code**, rerun `npm run build:ios`
- **iOS icons** should be updated in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **The iOS folder is gitignored** except for icons and Info.plist

## Configuration

The project includes:
- **Capacitor config**: `capacitor.config.ts`
- **App ID**: `com.mochimo.ioswallet`
- **App Name**: `Mochimo Wallet`
- **Web directory**: `dist`

## CI/CD with GitHub Actions

The project is ready for automation via GitHub Actions:

### Automatic iOS Build

The CI/CD pipeline for iOS:
1. Triggers on push to the `ios` branch
2. Installs all required dependencies (including CocoaPods)
3. Builds the webapp and syncs with Capacitor
4. Builds iOS in macOS environment
5. Uploads artifacts for testing

### App Store Release

To release to the App Store:
1. Create a tag with the format `ios-v*` (e.g. `ios-v1.0.0`)
2. The pipeline automatically creates a signed build
3. The build is uploaded to TestFlight
4. You can release it to the App Store from App Store Connect

## Project Structure

```
mochiwallet/
├── src/                    # Webapp source
├── dist/                   # Build output
├── ios/                    # Native iOS project (gitignored)
│   └── App/App/Assets.xcassets/AppIcon.appiconset/ # Icons (tracked)
├── .github/workflows/      # GitHub Actions CI/CD
├── capacitor.config.ts     # Capacitor configuration
└── package.json           # Dependencies and scripts
```

## License

See [LICENSE](LICENSE.md) for details.