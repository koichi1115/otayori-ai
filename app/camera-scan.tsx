import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Spacing, BorderRadius, BorderWidth, TouchTarget, IconButton } from '../src/constants/theme';

export default function CameraScanScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isTaking, setIsTaking] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const requestedRef = useRef(false);

  // Trigger the OS permission dialog directly on first mount — no custom
  // pre-permission prompt with an "Allow"-worded button or an exit button
  // (App Store Guideline 5.1.1(iv)).
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !requestedRef.current) {
      requestedRef.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Still resolving status, or the OS dialog is being shown — render nothing.
  if (!permission || (!permission.granted && permission.canAskAgain)) {
    return <View style={styles.container} />;
  }

  // Permission was permanently denied: this screen appears AFTER the user's
  // decision, so it may offer a Settings link and a way back.
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>カメラを利用できません</Text>
        <Text style={styles.permissionDesc}>プリントを撮影するには、設定アプリでカメラへのアクセスを許可してください</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={() => Linking.openSettings()}>
          <Text style={styles.permissionButtonText}>設定を開く</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>戻る</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady || isTaking) return;
    setIsTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        router.replace({
          pathname: '/(tabs)/scan',
          params: { capturedUri: photo.uri, capturedName: `scan_${Date.now()}.jpg` },
        });
      }
    } catch {
      setIsTaking(false);
    }
  };

  const flashOn = flash === 'on';

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flash}
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Top bar */}
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topButton}>
            <Ionicons name="close" size={28} color={Colors.onCamera} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>プリントを撮影</Text>
          <TouchableOpacity
            onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
            style={styles.topButton}
          >
            <Ionicons name={flashOn ? 'flash-outline' : 'flash-off-outline'} size={24} color={Colors.onCamera} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Guide overlay */}
        <View style={styles.guideContainer}>
          <View style={styles.guideFrame}>
            <Text style={styles.guideText}>プリント全体が枠内に入るように撮影してください</Text>
          </View>
        </View>

        {/* Bottom bar */}
        <SafeAreaView style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.shutterButton, isTaking && styles.shutterDisabled]}
            onPress={takePicture}
            disabled={isTaking}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cameraBackground },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  permissionTitle: { ...Type.title, color: Colors.text, marginTop: Spacing.lg },
  permissionDesc: { ...Type.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  permissionButton: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    justifyContent: 'center', minHeight: TouchTarget.min,
    borderRadius: BorderRadius.md, marginTop: Spacing.xl,
  },
  permissionButtonText: { ...Type.leadStrong, color: Colors.onPrimary },
  cancelButton: { justifyContent: 'center', minHeight: TouchTarget.min, marginTop: Spacing.sm },
  cancelButtonText: { ...Type.body, color: Colors.textSecondary },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  topButton: { ...IconButton },
  topTitle: { ...Type.leadStrong, color: Colors.onCamera },
  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  guideFrame: {
    width: '90%', aspectRatio: 0.707, // A4 ratio
    borderWidth: BorderWidth.thin, borderColor: Colors.cameraGuide, borderRadius: BorderRadius.lg,
    justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Spacing.md,
  },
  guideText: { ...Type.caption, color: Colors.onCamera, textAlign: 'center' },
  bottomBar: { alignItems: 'center', paddingBottom: Spacing.lg },
  shutterButton: {
    width: 72, height: 72, borderRadius: BorderRadius.full,
    minWidth: TouchTarget.min, minHeight: TouchTarget.min,
    borderWidth: BorderWidth.thin, borderColor: Colors.onCamera,
    justifyContent: 'center', alignItems: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 58, height: 58, borderRadius: BorderRadius.full, backgroundColor: Colors.onCamera,
  },
});
