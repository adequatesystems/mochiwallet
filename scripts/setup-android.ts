import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🤖 Setting up Android environment...');

// Check if Android is already set up
if (!fs.existsSync(path.resolve('./android'))) {
  console.log('Adding Android platform to Capacitor...');
  spawnSync('npx', ['cap', 'add', 'android'], { stdio: 'inherit' });
} else {
  console.log('Android platform already exists');
}

// Copy Android assets from assets/android to android/app/src/main
console.log('📦 Copying Android assets...');
const assetsAndroidPath = path.resolve('./assets/android');
const androidResPath = path.resolve('./android/app/src/main/res');
const androidManifestPath = path.resolve('./android/app/src/main/AndroidManifest.xml');

if (fs.existsSync(assetsAndroidPath)) {
  // Copy mipmap folders
  const mipmapFolders = fs.readdirSync(assetsAndroidPath).filter(name => name.startsWith('mipmap-'));
  mipmapFolders.forEach(folder => {
    const sourcePath = path.join(assetsAndroidPath, folder);
    const destPath = path.join(androidResPath, folder);
    console.log(`Copying ${folder}...`);
    
    // Remove destination folder if it exists to avoid conflicts
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
      console.log(`Removed existing ${folder} folder`);
    }
    
    // Create destination directory
    fs.mkdirSync(destPath, { recursive: true });
    
    // Copy each file individually
    const files = fs.readdirSync(sourcePath);
    files.forEach(file => {
      const sourceFile = path.join(sourcePath, file);
      const destFile = path.join(destPath, file);
      fs.copyFileSync(sourceFile, destFile);
      console.log(`Copied ${file} to ${folder}`);
    });
  });
  
  // Copy AndroidManifest.xml if exists
  const manifestSource = path.join(assetsAndroidPath, 'AndroidManifest.xml');
  if (fs.existsSync(manifestSource)) {
    console.log('Copying AndroidManifest.xml...');
    spawnSync('cp', [manifestSource, androidManifestPath], { stdio: 'inherit' });
  }
  
  console.log('✅ Android assets copied successfully');
} else {
  console.log('⚠️ Android assets folder not found, skipping copy');
}


// Build web app
console.log('Building web app...');
spawnSync('npm', ['run', 'build:web'], { stdio: 'inherit' });

// Sync Capacitor
console.log('Syncing Capacitor...');
spawnSync('npx', ['cap', 'sync', 'android'], { stdio: 'inherit' });

// Patch build.gradle to enforce Java 17 and remove unsupported --release
const buildGradlePath = path.resolve('./android/build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
  const marker = '// Configure Java 17 compilation';
  if (!gradleContent.includes(marker)) {
    const block = `\n// Configure Java 17 compilation and remove unsupported --release flag for all Android modules
allprojects {
    tasks.withType(JavaCompile).configureEach {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        options.release = null
        options.compilerArgs.removeAll { arg -> arg.startsWith("--release") }
    }
}

subprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            project.android.compileOptions {
                sourceCompatibility JavaVersion.VERSION_17
                targetCompatibility JavaVersion.VERSION_17
            }
            project.tasks.withType(JavaCompile).configureEach {
                options.release = null
                options.compilerArgs.removeAll { arg -> arg.startsWith("--release") }
            }
        }
    }
}

// Force Java 17 for all Android plugins (application and library) - overrides capacitor-android defaults
subprojects { project ->
    project.plugins.withId('com.android.library') {
        project.android.compileOptions {
            sourceCompatibility JavaVersion.VERSION_17
            targetCompatibility JavaVersion.VERSION_17
        }
    }
    project.plugins.withId('com.android.application') {
        project.android.compileOptions {
            sourceCompatibility JavaVersion.VERSION_17
            targetCompatibility JavaVersion.VERSION_17
        }
    }
}\n`;
    fs.writeFileSync(buildGradlePath, gradleContent + block, 'utf8');
    console.log('🤖 Patched android/build.gradle for Java 17 configuration');
  }
}

console.log('✅ Android setup complete!');
console.log('You can now run:');
console.log('  npm run build:android - To build the Android APK');
console.log('  npx cap open android - To open in Android Studio');
