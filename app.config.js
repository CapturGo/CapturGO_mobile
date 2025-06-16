export default {
  name: "my-app",
  slug: "my-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.bhun.capturgoapp",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "This app uses your location to display it on the map and track your position while you are using the app.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location in the background to continuously track and record your position even when the app is closed.",
      UIBackgroundModes: [
        "location",
        "fetch"
      ]
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.FOREGROUND_SERVICE"
    ],
    package: "com.bhun.capturgoapp"
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location even when you are not using the app?",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true
      }
    ],
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
        RNMapboxMapsVersion: "11.0.0"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
};