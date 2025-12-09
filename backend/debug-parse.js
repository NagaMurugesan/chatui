const { XMLParser } = require('fast-xml-parser');

const xmlData = `<md:EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="http://localhost:8080/realms/gravity-realm"><md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"><md:KeyDescriptor use="signing"><ds:KeyInfo><ds:KeyName>J0py945y_AHlPN3YOhD0rJfHOsGdZlxCl_jCydZINvs</ds:KeyName><ds:X509Data><ds:X509Certificate>MIICqTCCAZECBgGbAbUx7DANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1ncmF2aXR5LXJlYWxtMB4XDTI1MTIwOTA2MDE1MFoXDTM1MTIwOTA2MDMzMFowGDEWMBQGA1UEAwwNZ3Jhdml0eS1yZWFsbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKEc11iF3Gme9TJIiiYW7qZF1ZffX4Cvr85rOjmZi9aHMmdYn/3PbZd0+5nPCy5D0ucP3cEMmVfOdZ2m2tIadKRUouJvj4QMr0AX3v0ii6Lbb9/rJPbQv6q2T3sIwbe6HtIKaRIkeZPyjYY6yRFfHpkJfZb1j7Ty79XXb5K3rFPmpNTqnP+477UmVsc8DA5Z+E/zmJNRN+428PwAcDpT8d8iVzvVCFqmeKPBAgXLFZGbw097DEeVeuEILqPPFfr8tANn3fBr6hOHsUIpOMQTCuTO7t0UOTr8tUaym+PN48bPuYfdmnFGuAQ0RqjTUPXkBNkXgj7wfG6emROsyTvj4psCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAd7VwdDlzXZGPk6eUzunJDzV5rfyENH1ahBUB7b281gJjaK3iIVaNnIv5P6pMfo/Emcy6IrEAZo9gdViE5L55gGX6Qgx4dGWVvv5JyeZ35jBkDV3yD7K23WB6ti4kU37S3m4MvVJKyQwHOOjluJmKkl3Pwgug8zHF6WLAm/RcXIWlUE5G3UfBFceCq9iUd/jSVYSbX8Vg8nPYVlpt0SFDWP0ZG2XEKQW/N+xGuWWdq8p7EAT3RXZ5k9xhSLlZpReGg+yn+FXl/eNdZK0PlpgZaq7CwM1AZUOxtokkpvSO/+ju536I5oxOUYsCf2tRtDvGnkRpuqhiWHikX52m1IM4Yw==</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor><md:ArtifactResolutionService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="http://localhost:8080/realms/gravity-realm/protocol/saml/resolve" index="0"></md:ArtifactResolutionService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleLogoutService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleLogoutService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleLogoutService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleLogoutService><md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleSignOnService><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleSignOnService><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleSignOnService><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="http://localhost:8080/realms/gravity-realm/protocol/saml"></md:SingleSignOnService></md:IDPSSODescriptor></md:EntityDescriptor>`;

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});
const jsonObj = parser.parse(xmlData);

const findKey = (obj, keySuffix) => {
    for (const key in obj) {
        if (key.endsWith(keySuffix)) return obj[key];
    }
    return null;
};

const entityDescriptor = findKey(jsonObj, 'EntityDescriptor');
const idpDescriptor = findKey(entityDescriptor, 'IDPSSODescriptor');

let keyDescriptors = findKey(idpDescriptor, 'KeyDescriptor');
let cert = '';

const extractCert = (kd) => {
    const keyInfo = findKey(kd, 'KeyInfo');
    if (keyInfo) {
        const x509Data = findKey(keyInfo, 'X509Data');
        if (x509Data) {
            const x509Cert = findKey(x509Data, 'X509Certificate');
            if (x509Cert) return x509Cert;
        }
    }
    return null;
};

if (Array.isArray(keyDescriptors)) {
    const signingKey = keyDescriptors.find((k) => k['@_use'] === 'signing');
    if (signingKey) {
        cert = extractCert(signingKey);
    } else {
        cert = extractCert(keyDescriptors[0]);
    }
} else if (keyDescriptors) {
    cert = extractCert(keyDescriptors);
}

console.log('Cert:', cert);
