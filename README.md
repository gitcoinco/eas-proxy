# eas-proxy

This EAS proxy will be the attester who will write the stamps into EAS attestations

## Deployments

See latest contract addresses and other deployment
info&mdash;organized by chain ID&mdash;[here](deployments/onchainInfo.json).

- Optimism (0xa)
- Base Goerli (0x14a33)

The file has the following schema:

_Fields marked with a pencil (✏️) are manually filled out, the rest are
populated by scripts_

```json
{
  "[chainId]": {
    "issuer": {
      "address": "[✏️ test or production issuer address (see below)]"
    },
    "EAS": {
      "address": "[✏️ address of the EAS contract]"
    },
    "GitcoinAttester": {
      "address": "[address of the GitcoinAttester contract]"
    },
    "GitcoinVerifier": {
      "address": "[address of the GitcoinVerifier contract]"
    },
    "GitcoinResolver": {
      "address": "[address of the GitcoinResolver contract]"
    },
    "easSchemas": {
      "passport": {
        "uid": "[✏️ uid of the Passport EAS Schema]"
      },
      "score": {
        "uid": "[✏️ uid of the Passport score EAS Schema]"
      }
    }
  }
}
```

## Issuers

These are the addresses signing attestation data, the verifier only accepts attestations
signed by the appropriate address.

The production address is used only in the production environment of the
Passport app with mainnet chains.
The testnet address is used with all other environments.

### Production

0x804233b96cbd6d81efeb6517347177ef7bD488ED

### Test

0x5f603Ed913738d9105bAf3BD981AA4750016B167

_Note: the issuer address is **not the attester address**_

## Other Topics

[Section 0: On-Chain Data Overview](docs/00-on-chain-data.md)

[Section 1: On-Chain Passport Attestation](docs/01-on-chain-passport-attestation.md)

[Section 2: On-Chain Stamp Attestation ⚠️ _not used_ ⚠️](docs/02-on-chain-stamp-attestation.md)

[Section 3: New Chain Deployment Process](docs/03-new-deployment.md)
