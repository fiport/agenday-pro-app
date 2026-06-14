// Expo automatically loads .env files — EXPO_PUBLIC_* vars are available here.
const env = {
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  ADMIN_PHONE: process.env.EXPO_PUBLIC_ADMIN_PHONE,
  ADMIN_NAME: process.env.EXPO_PUBLIC_ADMIN_NAME,
  ADMIN_PASSWORD: process.env.EXPO_PUBLIC_ADMIN_PASSWORD,
};

export default {
  expo: {
    owner: "devacheiservicos",
    name: "Agenday PRO",
    slug: "agenday",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "agenday",
    userInterfaceStyle: "automatic",

    ios: {
      icon: "./assets/images/icon.png",
      bundleIdentifier: "com.devacheiservicos.agenday",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "O Agenday usa sua localização para mostrar empresas e serviços próximos a você.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "O Agenday usa sua localização para mostrar empresas e serviços próximos a você.",
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
      package: "com.devacheiservicos.agenday",
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    extra: {
      firebaseApiKey: env.FIREBASE_API_KEY,
      firebaseAuthDomain: env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: env.FIREBASE_APP_ID,
      adminPhone: env.ADMIN_PHONE,
      adminName: env.ADMIN_NAME,
    },

    plugins: [
      "expo-router",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "O Agenday precisa da sua localização para mostrar empresas próximas a você.",
          locationWhenInUsePermission: "O Agenday precisa da sua localização para mostrar empresas próximas a você.",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.4",
            extraPods: [
              {
                name: "GoogleUtilities",
                modular_headers: true,
              },
              {
                name: "FirebaseCore",
                modular_headers: true,
              },
              {
                name: "FirebaseCoreInternal",
                modular_headers: true,
              },
            ],
          },
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "O app precisa de acesso às suas fotos para enviar imagens.",
          cameraPermission: "O app precisa de acesso à câmera para tirar fotos.",
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76,
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
