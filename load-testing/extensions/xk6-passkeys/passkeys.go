// Package passkeys provides a k6 extension for passkeys load testing.
// This is a fork of github.com/corbado/xk6-passkeys with ImportCredential support.
package passkeys

import (
	"encoding/json"

	"github.com/descope/virtualwebauthn"
	"github.com/google/uuid"
	"go.k6.io/k6/js/modules"
)

const iCloudKeychainAaguid string = "fbfc3007-154e-4ecc-8c0b-6e020557d7bd"

func init() {
	modules.Register("k6/x/passkeys", new(Passkeys))
}

// Passkeys is the main struct for the passkeys module.
type Passkeys struct {
}

// NewCredential creates a new credential.
func (p *Passkeys) NewCredential() virtualwebauthn.Credential {
	return virtualwebauthn.NewCredential(virtualwebauthn.KeyTypeEC2)
}

// ExportCredential exports a credential to JSON string for serialization.
// This is useful for passing credentials from setup() to default() in k6.
func (p *Passkeys) ExportCredential(credential virtualwebauthn.Credential) string {
	data, err := json.Marshal(credential)
	if err != nil {
		panic(err)
	}
	return string(data)
}

// ImportCredential imports a credential from JSON string.
// This reconstructs the credential with its signing key from serialized data.
func (p *Passkeys) ImportCredential(jsonData string) virtualwebauthn.Credential {
	var cred virtualwebauthn.Credential
	if err := json.Unmarshal([]byte(jsonData), &cred); err != nil {
		panic(err)
	}
	return cred
}

// NewRelyingParty creates a new relying party.
func (p *Passkeys) NewRelyingParty(name string, id string, origin string) virtualwebauthn.RelyingParty {
	return virtualwebauthn.RelyingParty{Name: name, ID: id, Origin: origin}
}

// ExportRelyingParty exports a relying party to JSON string for serialization.
func (p *Passkeys) ExportRelyingParty(rp virtualwebauthn.RelyingParty) string {
	data, err := json.Marshal(rp)
	if err != nil {
		panic(err)
	}
	return string(data)
}

// ImportRelyingParty imports a relying party from JSON string.
func (p *Passkeys) ImportRelyingParty(jsonData string) virtualwebauthn.RelyingParty {
	var rp virtualwebauthn.RelyingParty
	if err := json.Unmarshal([]byte(jsonData), &rp); err != nil {
		panic(err)
	}
	return rp
}

// CreateAttestationResponse creates an attestation response.
func (p *Passkeys) CreateAttestationResponse(
	rp virtualwebauthn.RelyingParty,
	credential virtualwebauthn.Credential,
	attestationOptions string,
) string {
	aaguid, err := uuid.Parse(iCloudKeychainAaguid)
	if err != nil {
		panic(err)
	}

	authenticator := virtualwebauthn.NewAuthenticatorWithOptions(virtualwebauthn.AuthenticatorOptions{
		BackupEligible: true,
		BackupState:    true,
	})
	authenticator.Aaguid = [16]byte(aaguid)

	parsedAttestationOptions, err := virtualwebauthn.ParseAttestationOptions(attestationOptions)
	if err != nil {
		panic(err)
	}

	return virtualwebauthn.CreateAttestationResponse(rp, authenticator, credential, *parsedAttestationOptions)
}

// CreateAssertionResponse creates an assertion response.
func (p *Passkeys) CreateAssertionResponse(
	rp virtualwebauthn.RelyingParty,
	credential virtualwebauthn.Credential,
	userHandle string,
	assertionOptions string,
) string {
	aaguid, err := uuid.Parse(iCloudKeychainAaguid)
	if err != nil {
		panic(err)
	}

	authenticator := virtualwebauthn.NewAuthenticatorWithOptions(virtualwebauthn.AuthenticatorOptions{
		UserHandle:     []byte(userHandle),
		BackupEligible: true,
		BackupState:    true,
	})
	authenticator.Aaguid = [16]byte(aaguid)

	parsedAssertionOptions, err := virtualwebauthn.ParseAssertionOptions(assertionOptions)
	if err != nil {
		panic(err)
	}

	return virtualwebauthn.CreateAssertionResponse(rp, authenticator, credential, *parsedAssertionOptions)
}
