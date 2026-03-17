// plugins/withNetworkSecurityConfig.js
// SEC-M6: Android Certificate Pinning via Network Security Config
// This config plugin runs during `expo prebuild` to generate the required
// network_security_config.xml files and update AndroidManifest.xml.

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PRODUCTION_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<!--
    SEC-M6: Android Network Security Config — Certificate Pinning

    ⚠️  BEFORE RELEASE — replace placeholder hashes with real SPKI values:

    1. Extract leaf certificate SPKI hash:
       openssl s_client -connect api.connecto.app:443 -servername api.connecto.app 2>/dev/null \\
         | openssl x509 -pubkey -noout \\
         | openssl pkey -pubin -outform der \\
         | openssl dgst -sha256 -binary \\
         | openssl enc -base64

    2. Extract backup pin (Let's Encrypt ISRG Root X1):
       curl -sO https://letsencrypt.org/certs/isrgrootx1.pem
       openssl x509 -in isrgrootx1.pem -pubkey -noout \\
         | openssl pkey -pubin -outform der \\
         | openssl dgst -sha256 -binary \\
         | openssl enc -base64

    3. Replace both PLACEHOLDER values below with extracted hashes.
    4. Repeat for socket.connecto.app (same cert = same hash).
    5. Update expiration to (cert expiry date - 30 days).

    NOTE: While placeholders are present, ALL release build API calls will be blocked.
          This is intentional — forces hash replacement before shipping.
-->
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="false">api.connecto.app</domain>
        <domain includeSubdomains="false">socket.connecto.app</domain>
        <pin-set expiration="2027-06-01">
            <!-- TODO: Replace with actual leaf certificate SPKI hash -->
            <pin digest="SHA-256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</pin>
            <!-- TODO: Replace with actual backup pin (ISRG Root X1) -->
            <pin digest="SHA-256">BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
`;

const DEBUG_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<!--
    DEBUG ONLY: Certificate pinning disabled + cleartext (HTTP) allowed.
    This file overrides src/main/res/xml/network_security_config.xml for debug builds.
    Allows connections to emulator (10.0.2.2) and LAN IPs.
    Charles Proxy / Proxyman SSL inspection also works in debug.
-->
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
</network-security-config>
`;

/**
 * Write network_security_config.xml for both main (release) and debug build variants.
 */
const withNetworkSecurityConfigFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;

      // Production config
      const mainXmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(mainXmlDir, { recursive: true });
      fs.writeFileSync(path.join(mainXmlDir, 'network_security_config.xml'), PRODUCTION_CONFIG, 'utf8');

      // Debug override
      const debugXmlDir = path.join(androidRoot, 'app', 'src', 'debug', 'res', 'xml');
      fs.mkdirSync(debugXmlDir, { recursive: true });
      fs.writeFileSync(path.join(debugXmlDir, 'network_security_config.xml'), DEBUG_CONFIG, 'utf8');

      return config;
    },
  ]);
};

/**
 * Add android:networkSecurityConfig attribute to <application> in AndroidManifest.xml.
 */
const withNetworkSecurityConfigManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return config;
  });
};

module.exports = (config) => {
  config = withNetworkSecurityConfigFiles(config);
  config = withNetworkSecurityConfigManifest(config);
  return config;
};
