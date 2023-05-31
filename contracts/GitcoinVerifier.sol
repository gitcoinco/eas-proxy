// SPDX-License-Identifier: GPL
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {AttestationRequest, AttestationRequestData, IEAS, Attestation, MultiAttestationRequest} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

import "./GitcoinAttester.sol";

/**
 * @title GitcoinVerifier
 * @notice This contract is used to verify a passport's authenticity and to add a passport to the GitcoinAttester contract using the addPassportWithSignature() function.
 */
contract GitcoinVerifier {
    using ECDSA for bytes32;

    GitcoinAttester public attester;

    constructor(address _attester) {
        attester = GitcoinAttester(_attester);
    }

    function multiAttest(
        MultiAttestationRequest[] calldata multiAttestationRequest
    ) public payable returns (bytes32[] memory) {
        return attester.addPassport(multiAttestationRequest);
    }
}
