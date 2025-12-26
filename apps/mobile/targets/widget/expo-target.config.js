/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "MoveBoss Widget",
  icon: "https://github.com/expo.png",
  deploymentTarget: "16.2",
  frameworks: ["SwiftUI", "ActivityKit"],
  entitlements: {
    "com.apple.developer.usernotifications.time-sensitive": true,
  },
});
