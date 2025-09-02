#!/usr/bin/env tsx
/**
 * Script for iOS distribution build (App Store)
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
    console.error(`Error running command: ${command}`);
    console.error(error);
    process.exit(1);
    return '';
  }
}

// Styled log
function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

// MAIN BUILD PROCESS
async function main() {
  log('🚀 Starting iOS distribution build...', colors.bright + colors.blue);
  
  // Check if iOS project exists
  const iosPath = path.join(process.cwd(), 'ios');
  if (!fs.existsSync(iosPath)) {
    log('❌ iOS project not found. Run npm run setup:ios first.', colors.red);
    process.exit(1);
  }
  
  // Optimized webapp build
  log('\n📦 Building optimized webapp...', colors.bright);
  runCommand('npm run build:web');
  
  // Sync with Capacitor
  log('\n📦 Syncing Capacitor...', colors.bright);
  runCommand('npx cap sync ios');
  
  // Manual instructions for App Store build
  log('\n📦 Preparing for App Store distribution...', colors.bright);
  log('\nTo complete the App Store build:', colors.yellow);
  log('1. Open the project in Xcode:', colors.bright);
  log('   npx cap open ios', colors.blue);
  log('\n2. In Xcode, select the "App" target and configure:', colors.bright);
  log('   - Signing & Capabilities: Make sure your Apple Developer account is selected', colors.blue);
  log('   - Bundle Identifier: Make sure it matches your registered App ID', colors.blue);
  log('\n3. To archive the app for TestFlight/App Store:', colors.bright);
  log('   - Menu Product > Archive', colors.blue);
  log('   - After archiving, use the Organizer window to validate and distribute', colors.blue);
  
  // Optional: Future automation
  log('\nNote: In the future, this process will be fully automated via GitHub Actions', colors.green);
  
  // Open Xcode
  log('\n📦 Opening project in Xcode...', colors.bright);
  runCommand('npx cap open ios');
}

// Run script
main().catch(error => {
  console.error('❌ Error during build:', error);
  process.exit(1);
});
