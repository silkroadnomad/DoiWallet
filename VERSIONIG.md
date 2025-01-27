
# Versioning Guidelines

This document explains how the project versioning is structured for the Doichain repository hosted on GitHub. The version format follows a specific pattern:

## 📌 Version Format
```
dc7.0.8120
```

## 🔍 Components of the Version
1. **Prefix**: `dc`
   - Indicates the Doichain-specific versioning system.

2. **Base Version**: `7.0.8`
   - This part is inherited from the original project at [BlueWallet GitHub Repository](https://github.com/BlueWallet/BlueWallet.git).

3. **Build Number**: `120`
   - Represents the Android build number. This is incremented for each new Android release without following the semantic versioning structure `X.Y.Z`.

## 🚀 Special Notes for Platforms

### Android
- Each new version for Android includes a unique build number that does not conform to the standard semantic versioning format (`X.Y.Z`).
- The build number ensures that every Android release has a distinct version for distribution.

### App Store (iOS)
- Apple App Store requires the version number to be incremented with each submission. This may result in discrepancies between the forked base project’s version and the published iOS version.
- To address this, the Android release number is appended to the version to maintain clarity and traceability across platforms.

## 🏷️ Tagging System
- Each version tag provides a clear mapping to the original project version, the Android release, and the iOS release.
- Tags in the GitHub repository reflect the versioning structure and include both the base project version and the platform-specific identifiers.

## 💡 Example
- **Version**: `dc7.0.8120`
  - `dc`: Doichain prefix
  - `7.0.8`: Original project version from BlueWallet
  - `120`: Android build number
  - `7.0.8120`: iOS build number

## 📝 Summary
This versioning approach ensures traceability and platform-specific version control while maintaining a clear connection to the base project. If you have further questions, please refer to the tagging information in the GitHub repository or contact the maintainers.
