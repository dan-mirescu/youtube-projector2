This application is in a proof-of-concept alpha stage.
Tested on Android emulator and Samsung S9 (Android) and on Windows PC (by running the Node code separately).

An Android application project created for the following use case:
- view youtube videos on a smart TV with a faulty Youtube application
- view youtube videos without ads on a smart TV

The Android app is mostly a wrapper around a Node application which creates two web servers:
- A remote control web app (controller)
- A video player web app (projector)

The remote control communicates with the video player via Socket.io.

Alternately, the Node code contained within the application can be run separately on any other platform.

To use the app you will need to:
- have your smartphone (or some other device if you run the Node code separately) connected to the same LAN as
your smart TV
- load the video player web app in the smart TV's web browser
- paste a youtube URL in the remote control app
- control the video player with your smartphone (or some other device).

The remote control and the player web apps were intentionally developed without using latest ECMA features
because both smart TV web browsers and Android webviews can have an out-of-date Javascript engine.

The Android application project is based on the Native Gradle Sample from here: https://github.com/JaneaSystems/nodejs-mobile-samples/tree/master/android/native-gradle which is based on [`Node.js on Mobile`]( https://github.com/janeasystems/nodejs-mobile).

For building the Android app:
- Load the project in the latest version of Android Studio
- The following quote from [`Native Gradle Sample`](https://github.com/JaneaSystems/nodejs-mobile-samples/tree/master/android/native-gradle): It will automatically check for dependencies and prompt you to install missing requirements (i.e. you may need to update the Android SDK build tools to the required version (25.0.3) and install CMake to compile the C++ file that bridges Java to the Node.js on Mobile library).
- If Android Studio doesn't automatically recommend it, you should also make sure you have Android NDK installed.
- Run npm install inside the Node project root folder: app/src/main/assets/nodejs-project

If you have trouble, you can try to update Gradle to latest (project Gradle and/or Android Studio Gradle plugin - I remember doing something like this).

- Finally, you can build and run the app.


For running Node separately:
- The Node project root folder is in [`app/src/main/assets/nodejs-project`](https://github.com/dan-mirescu/youtube-projector2/tree/main/app/src/main/assets/nodejs-project). This project can be loaded in Visual Studio code and debugged separately.
- Just run node main.js or start the debugger using main.js as the startup file

For debugging the remote control (controller) web app while running on Android:
- Make sure that your Android device or emulator can be detected by adb (Android Debug Bridge). adb.exe is part of the Android development tools. To list the detected devices, run adb devices in a terminal.
- To debug an Android device, you need to and enable debugging on your device and connect the device to your PC with a data cable: https://developer.android.com/studio/debug/dev-options
- Also refer to this page about Android debugging: https://developer.android.com/studio/debug
- While the app is started on your Android device and adb devices lists your device:
- Open Chrome on your pc and open a new tab with the following address: chrome://inspect/#devices
- After several seconds, you should see one or more entries under the "Remote Target" heading. Choose the active entry referring to your app's webview and click Inspect
- A new developer tools window connected to the app webview will be displayed and you can debug the webview there.

In order to debug the video player (projector) web app in the smart TV web browser, you can use a tool such as https://remotejs.com/