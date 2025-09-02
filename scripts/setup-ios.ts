#!/usr/bin/env tsx
/**
 * Complete setup script for iOS environment
 * - Checks and installs Ruby and CocoaPods
 * - Configures Capacitor
 * - Installs native dependencies
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

// Run a command and return output
function runCommand(command: string, silent = false): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (error) {
    return '';
  }
}

// Styled log
function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

// Check if a command exists
function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if a directory exists
function directoryExists(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// MAIN SETUP PROCESS
async function main() {
  log('🚀 Starting iOS environment setup...', colors.bright + colors.blue);
  
  // Check Ruby
  log('\n📦 Checking Ruby installation...', colors.bright);
  const rubyInstalled = commandExists('ruby');
  const rubyVersion = rubyInstalled ? runCommand('ruby --version', true) : '';
  
  if (!rubyInstalled) {
    log('❌ Ruby not found. Installing...', colors.yellow);
    runCommand('brew install ruby');
  } else {
    log(`✅ Ruby found: ${rubyVersion.trim()}`, colors.green);
  }
  
  // Check PATH
  log('\n📦 Configuring Ruby PATH...', colors.bright);
  const zshrcPath = path.join(process.env.HOME || '~', '.zshrc');
  const brewRubyPath = '/opt/homebrew/opt/ruby/bin';
  
  // Read .zshrc if exists
  let zshrcContent = '';
  if (fs.existsSync(zshrcPath)) {
    zshrcContent = fs.readFileSync(zshrcPath, 'utf8');
  }
  
  // Add Ruby to PATH if not present
  if (!zshrcContent.includes(brewRubyPath)) {
    log('Adding Ruby to PATH...', colors.yellow);
    fs.appendFileSync(zshrcPath, `\nexport PATH="${brewRubyPath}:$PATH"\n`);
    
    // Find gem path
    const gemDirs = runCommand('ls /opt/homebrew/lib/ruby/gems/', true).trim().split('\n');
    if (gemDirs.length > 0) {
      const latestGemDir = gemDirs[gemDirs.length - 1];
      fs.appendFileSync(zshrcPath, `export PATH="/opt/homebrew/lib/ruby/gems/${latestGemDir}/bin:$PATH"\n`);
    }
    
    log('🔄 Reloading shell environment...', colors.yellow);
    runCommand(`source ${zshrcPath}`);
  } else {
    log('✅ Ruby already in PATH', colors.green);
  }
  
  // Check CocoaPods
  log('\n📦 Checking CocoaPods installation...', colors.bright);
  const podInstalled = commandExists('pod');
  const podVersion = podInstalled ? runCommand('pod --version', true) : '';
  
  if (!podInstalled) {
    log('❌ CocoaPods not found. Installing...', colors.yellow);
    runCommand('sudo gem install cocoapods');
  } else {
    log(`✅ CocoaPods found: ${podVersion.trim()}`, colors.green);
  }
  
  // Check Xcode
  log('\n📦 Checking Xcode configuration...', colors.bright);
  const xcodeSelectOutput = runCommand('xcode-select -p', true);
  if (!xcodeSelectOutput.includes('Developer')) {
    log('❌ Xcode not properly configured.', colors.red);
    log('Configuring Xcode...', colors.yellow);
    runCommand('sudo xcode-select -s /Applications/Xcode.app/Contents/Developer');
    log('Accepting Xcode license...', colors.yellow);
    runCommand('sudo xcodebuild -license accept');
  } else {
    log('✅ Xcode properly configured', colors.green);
  }
  
  // Setup Capacitor
  log('\n📦 Configuring Capacitor...', colors.bright);
  
  const capacitorConfigExists = fs.existsSync(path.join(process.cwd(), 'capacitor.config.ts'));
  if (!capacitorConfigExists) {
    log('Initializing Capacitor...', colors.yellow);
    runCommand('npx cap init "Mochimo Wallet" "com.mochimo.ioswallet"');
  } else {
    log('✅ Capacitor already configured', colors.green);
  }
  
  // Check iOS platform
  log('\n📦 Checking iOS platform...', colors.bright);
  const iosExists = directoryExists(path.join(process.cwd(), 'ios'));
  
  if (!iosExists) {
    log('Adding iOS platform...', colors.yellow);
    runCommand('npx cap add ios');
  } else {
    log('✅ iOS platform already added', colors.green);
  }
  
  // Copy iOS assets
  log('\n📦 Copying iOS assets...', colors.bright);
  const xcassetsSource = path.join(process.cwd(), 'assets', 'ios', 'Assets.xcassets', 'AppIcon.appiconset');
  const xcassetsDest = path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  if (directoryExists(xcassetsSource) && directoryExists(path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets'))) {
    log('Copying AppIcon.appiconset from assets/ios/Assets.xcassets/...', colors.yellow);
    runCommand(`cp -R ${xcassetsSource} ${path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets')}/`);
  } else {
    log('⚠️ AppIcon.appiconset not found in assets/ios/Assets.xcassets or destination missing', colors.yellow);
  }
  
  // Install pods
  log('\n📦 Installing native dependencies (CocoaPods)...', colors.bright);
  const iosAppPath = path.join(process.cwd(), 'ios', 'App');
  
  if (directoryExists(iosAppPath)) {
    log('Running pod install...', colors.yellow);
    runCommand(`cd ${iosAppPath} && pod install`);
  } else {
    log('❌ ios/App folder not found!', colors.red);
  }
  
  // Build webapp
  log('\n📦 Building webapp...', colors.bright);
  runCommand('npm run build:web');
  
  // Sync capacitor
  log('\n📦 Syncing Capacitor...', colors.bright);
  runCommand('npx cap sync ios');
  
  log('\n✅ iOS setup completed successfully!', colors.bright + colors.green);
  log('\nNow you can run:', colors.bright);
  log('  npm run build:ios    # Build and open in Xcode', colors.blue);
  log('  npm run dist:ios     # Create distribution package', colors.blue);
}

// Run script
main().catch(error => {
  console.error('❌ Error during setup:', error);
  process.exit(1);
});
