import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../src/constants/theme';

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
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>プリントを撮影</Text>
          <TouchableOpacity
            onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
            style={styles.topButton}
          >
            <Ionicons name={flash === 'off' ? 'flash-off' : 'flash'} size={24} color="white" />
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
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  permissionTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.lg },
  permissionDesc: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  permissionButton: {
    backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 12, marginTop: Spacing.xl,
  },
  permissionButtonText: { color: 'white', fontSize: FontSize.lg, fontWeight: '600' },
  cancelButton: { marginTop: Spacing.md },
  cancelButtonText: { color: Colors.textSecondary, fontSize: FontSize.md },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  topButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topTitle: { color: 'white', fontSize: FontSize.lg, fontWeight: '600' },
  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  guideFrame: {
    width: '90%', aspectRatio: 0.707, // A4 ratio
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8,
    justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Spacing.md,
  },
  guideText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, textAlign: 'center' },
  bottomBar: { alignItems: 'center', paddingBottom: Spacing.lg },
  shutterButton: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: 'white',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: 'white',
  },
});
