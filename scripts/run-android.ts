#!/usr/bin/env tsx
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

console.log('🤖 Launching Android emulator and deploying app...');

// Ensure emulator binary exists
const emuCheck = spawnSync('which', ['emulator'], { encoding: 'utf8' }).stdout.trim();
if (!emuCheck) {
  console.error('❌ emulator tool not found. Make sure $ANDROID_SDK_ROOT/emulator is in your PATH.');
  process.exit(1);
}

// List available AVDs
const list = spawnSync('emulator', ['-list-avds'], { encoding: 'utf8' }).stdout.trim().split(/\r?\n/).filter(Boolean);
if (list.length === 0) {
  console.error('❌ No Android Virtual Devices found. Create one in Android Studio first.');
  process.exit(1);
}

const chooseAndRun = (avdName: string) => {
  console.log(`🚀 Starting emulator: ${avdName}`);
  const emuProcess = spawn('emulator', ['-avd', avdName, '-netdelay', 'none', '-netspeed', 'full'], {
    stdio: 'ignore',
    detached: true,
  });
  emuProcess.unref();

  // Wait for device
  console.log('⌛ Waiting for emulator to be ready...');
  spawnSync('adb', ['wait-for-device'], { stdio: 'inherit' });

  // Build and install APK
  console.log('🔧 Building and installing app on emulator...');
  spawnSync('npm', ['run', 'build:android'], { stdio: 'inherit' });

  const apkPath = path.resolve('android/app/build/outputs/apk/debug/app-debug.apk');
  if (fs.existsSync(apkPath)) {
    spawnSync('adb', ['install', '-r', apkPath], { stdio: 'inherit' });
    console.log('✅ App deployed successfully!');
  } else {
    console.error(`❌ APK not found at ${apkPath}`);
  }
  process.exit(0);
};

if (list.length === 1) {
  chooseAndRun(list[0]);
} else {
  console.log('Select an emulator to launch:');
  list.forEach((name, i) => console.log(`  [${i + 1}] ${name}`));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter choice: ', (answer) => {
    const idx = parseInt(answer, 10) - 1;
    rl.close();
    if (idx >= 0 && idx < list.length) {
      chooseAndRun(list[idx]);
    } else {
      console.error('❌ Invalid selection');
      process.exit(1);
    }
  });
}
