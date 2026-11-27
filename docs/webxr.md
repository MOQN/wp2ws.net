# WebXR

<!-- ![WebXR screenshot 01](assets-webxr/webxr-01.png) -->
<!-- ![WebXR screenshot 02](assets-webxr/webxr-02.png) -->

**WebXR** lets you create extended reality experiences on the web. **XR (Extended Reality)** is an umbrella term for VR and AR.

* **VR (Virtual Reality)** lets you build immersive 3D scenes.
* **AR (Augmented Reality)** lets you use passthrough and depth sensing to place virtual objects in your physical surroundings.

Start with [04 · Enter immersive VR](/vr/04_webxr_enter_vr/index.html ":ignore"). This guide uses a Meta Quest 3, a computer, and VS Code Live Server.

## 1. Run a Three.js scene in VR

First, check that your scene renders in a normal browser tab. Use an HTTPS address like `https://wp2ws.net/vr/` or a local address like `http://localhost:5500/`.

In the example's `index.html`, add these lines inside the existing module script.

```js
import { VRButton } from "three/addons/webxr/VRButton.js";
window.VRButton = VRButton;
```

After the renderer is created, enable XR and add the button. In example 04, this goes in `setupWebXR()`.

```js
renderer.xr.enabled = true;
document.body.append(VRButton.createButton(renderer));
```

!> The example already calls `renderer.setAnimationLoop(animate)`! <br>
We’ve been using it from the beginning to support **WebXR** :D

## 2. Turn on Developer Mode with your phone

1. Install the **Meta Horizon app on your phone** from the App Store or Google Play.
2. Sign in with the Meta account you use on your Quest and pair the headset with the app. The account must be registered and verified as a Meta developer.
3. In the phone app, open **Devices**, select **Quest 3**, and go to **Headset Settings → Developer Mode**. Turn it on.

[Meta Developer Mode setup](https://developers.meta.com/vr/documentation/unreal/ts-mqdh-getting-started/)

## 3. Connect the Quest to your computer

ADB (Android Debug Bridge) lets your computer communicate with the headset.

* **macOS** — If you use Homebrew, install ADB with `brew install --cask android-platform-tools`. Otherwise, download and unzip [Android SDK Platform-Tools for Mac](https://developer.android.com/tools/releases/platform-tools#downloads), then open Terminal in the extracted `platform-tools` folder and run `./adb version`.
* **Windows** — Download and unzip [Android SDK Platform-Tools for Windows](https://developer.android.com/tools/releases/platform-tools#downloads). Install the [Meta Quest ADB driver](https://developers.meta.com/vr/documentation/native/android/mobile-device-setup/#install-the-oculus-adb-drivers-windows-only), then open PowerShell in the extracted `platform-tools` folder and run `.\adb.exe version`.

1. Connect the Quest with a **USB-C data cable**.
2. Run `adb devices` and put on the headset.
3. When **Allow USB debugging?** appears, choose **Allow**.
   - If the prompt does not appear, unplug the USB cable, restart the Quest, and reconnect the cable once the headset is back on.
4. Run `adb devices` again. The status beside the headset should read `device`.

!> [Homebrew](https://brew.sh/) is a package manager for macOS. Use the `brew` command to install various tools like ADB from Terminal.

?> If you downloaded Platform-Tools manually, keep using that terminal in the `platform-tools` folder. Use `./adb` on macOS or `.\adb.exe` in Windows PowerShell in place of `adb` in the commands below.

## 4. Open your local example on the Quest

1. In VS Code, open the `12_webXR` folder in your local course examples and click **Go Live**. Check the port shown in your computer’s browser. The commands below assume it is `5500`.
2. Run the following command in the terminal where you set up ADB.

```bash
adb reverse tcp:5500 tcp:5500
```

3. In **Quest Browser**, open `http://localhost:5500/04_webxr_enter_vr/index.html`. If you opened a parent folder in VS Code, copy the path after the port from your computer’s browser. If Live Server uses another port, use that port in both parts of the ADB command and in the Quest address.

This lets you open your local files on the Quest over USB. You can also open the [hosted examples](/vr/ ":ignore") directly in Quest Browser.

## 5. View the Quest console on your computer

1. In **Chrome on your computer**, enter **`chrome://inspect/#devices`** in the address bar and check **Discover USB devices**.
2. Find the tab you opened in Quest Browser. Click **Inspect**, then open **Console** in DevTools.
3. In the Quest, click **Enter VR**. Example 04 logs `VR session started.` when you enter and `VR session ended.` when you leave.

```js
renderer.xr.addEventListener("sessionstart", function () {
  console.log("VR session started.");
});
```

1. After changing your code, reload the Quest tab and enter VR again.
2. Enable **Preserve log** if you want to keep messages across reloads.
3. To leave VR on Quest 3, press the **Meta button on the right controller** and choose **Quit** in the system menu.

[Meta remote debugging guide](https://developers.meta.com/vr/documentation/web/browser-remote-debugging/)

## Continue with the examples

* **Controllers** Point at a box, select it with the trigger, then grab and release it.
* **Hand tracking** Track the index fingertip, touch a box, then detect a pinch.
* **AR** Enter passthrough, find a surface with hit testing, then place an object.

[Open WebXR Examples](/vr/ ":ignore")

## Resources

* [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
* [Three.js VRButton](https://threejs.org/docs/pages/VRButton.html)
* [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html)
