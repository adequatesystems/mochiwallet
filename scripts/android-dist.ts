import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';


// Sync versionCode and versionName from package.json to build.gradle
try {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  const versionName = pkg.version;
  const parts = versionName.split('.').map(n => parseInt(n, 10) || 0);
  const versionCode = parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  const gradlePath = path.resolve('android/app/build.gradle');
  if (fs.existsSync(gradlePath)) {
    let content = fs.readFileSync(gradlePath, 'utf8');
    content = content.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
    content = content.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
    fs.writeFileSync(gradlePath, content, 'utf8');
    console.log(`🔢 Set Android versionCode ${versionCode}, versionName ${versionName}`);
  }
} catch (e) {
  console.warn('⚠️ Failed to sync version to build.gradle:', e);
}

console.log('🤖 Creating Android distribution build...');

// Make sure dependencies are installed
console.log('Installing dependencies...');
spawnSync('npm', ['install'], { stdio: 'inherit' });

// Build web app for production
console.log('Building web app in production mode...');
spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });

// Sync Capacitor
console.log('Syncing Capacitor...');
spawnSync('npx', ['cap', 'sync', 'android'], { stdio: 'inherit' });

// Build release APK
console.log('Building release APK...');
const apkResult = spawnSync('cd', ['android', '&&', './gradlew', 'assembleRelease'], { 
  stdio: 'inherit',
  shell: true 
});

if (apkResult.status !== 0) {
  console.error('❌ Android release APK build failed');
  process.exit(1);
}

// Build release App Bundle (AAB)
console.log('Building release App Bundle (AAB)...');
const aabResult = spawnSync('cd', ['android', '&&', './gradlew', 'bundleRelease'], { 
  stdio: 'inherit',
  shell: true 
});

if (aabResult.status === 0) {
  console.log('✅ Android release builds complete!');
  console.log('APK location: android/app/build/outputs/apk/release/app-release-unsigned.apk');
  console.log('AAB location: android/app/build/outputs/bundle/release/app-release.aab');
} else {
  console.error('❌ Android release AAB build failed');
  process.exit(1);
}
