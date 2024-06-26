import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  MultiRevocationRequest,
  EAS
} from "@ethereum-attestation-service/eas-sdk";

import { multiAttestationRequest } from "./helpers/mockAttestations";
import { EAS_CONTRACT_ADDRESS } from "./helpers/verifierTests";

describe("GitcoinAttester", function () {
  let gitcoinAttester: any,
    eas: EAS,
    easFactory: any,
    EASContractAddress: string,
    owner: any,
    iamAccount: any,
    recipient: any,
    mockVerifier: any,
    nonOwnerOrVerifier: any;

  this.beforeAll(async function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployGitcoinAttester() {
      EASContractAddress = EAS_CONTRACT_ADDRESS;

      // Contracts are deployed using the first signer/account by default
      const [
        ownerAccount,
        otherAccount,
        recipientAccount,
        mockVerifierAccount,
        nonOwnerOrVerifierAccount,
        easDeployer
      ] = await ethers.getSigners();

      owner = ownerAccount;
      iamAccount = otherAccount;
      recipient = recipientAccount;
      mockVerifier = mockVerifierAccount;
      nonOwnerOrVerifier = nonOwnerOrVerifierAccount;

      const GitcoinAttester = await ethers.getContractFactory(
        "GitcoinAttester"
      );
      gitcoinAttester = await GitcoinAttester.connect(owner).deploy();

      await gitcoinAttester.connect(owner).initialize();

      eas = new EAS(EASContractAddress);

      await gitcoinAttester.setEASAddress(EASContractAddress);

      await gitcoinAttester.addVerifier(mockVerifier.address);
    }

    await loadFixture(deployGitcoinAttester);
  });
  describe("Attestations", function () {
    it("should revert when non-owner tries to set EAS address", async function () {
      const tx = await gitcoinAttester
        .connect(owner)
        .setEASAddress(EASContractAddress);
      const receipt = await tx.wait();
      const EasSetEvent = receipt.logs.filter((log: any) => {
        return log.fragment.name == "EASSet";
      });
      expect(EasSetEvent.length).to.equal(1);
    });

    it("should emit event when new EAS address is set", async function () {
      await expect(
        gitcoinAttester.connect(iamAccount).setEASAddress(EASContractAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should write multiple attestations", async function () {
      const resultTx = await gitcoinAttester
        .connect(mockVerifier)
        .submitAttestations([multiAttestationRequest]);

      const result = await resultTx.wait();

      expect(result.logs?.length).to.equal(multiAttestationRequest.data.length);
    });

    it("should revert when a non allowed address attempts to write attestations", async function () {
      await expect(
        gitcoinAttester
          .connect(iamAccount)
          .submitAttestations([multiAttestationRequest])
      ).to.be.revertedWith("Only authorized verifiers can call this function");
    });

    it("should revert when non-owner tries to add a verifier", async function () {
      await expect(
        gitcoinAttester.connect(iamAccount).addVerifier(recipient.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when non-owner tries to remove a verifier", async function () {
      await expect(
        gitcoinAttester.connect(iamAccount).removeVerifier(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow owner to add and remove verifier", async function () {
      const addTx = await gitcoinAttester
        .connect(owner)
        .addVerifier(recipient.address);
      addTx.wait();

      expect(await gitcoinAttester.verifiers(recipient.address)).to.equal(true);

      const removeTx = await gitcoinAttester
        .connect(owner)
        .removeVerifier(recipient.address);
      removeTx.wait();

      expect(await gitcoinAttester.verifiers(recipient.address)).to.equal(
        false
      );
    });

    it("Should revert when adding an existing verifier", async function () {
      const tx = await gitcoinAttester
        .connect(owner)
        .addVerifier(recipient.address);
      tx.wait();

      expect(await gitcoinAttester.verifiers(recipient.address)).to.equal(true);

      await expect(
        gitcoinAttester.connect(owner).addVerifier(recipient.address)
      ).to.be.revertedWith("Verifier already added");
    });

    it("Should revert when removing a verifier not in the allow-list", async function () {
      await expect(
        gitcoinAttester.connect(owner).removeVerifier(iamAccount.address)
      ).to.be.revertedWith("Verifier does not exist");
    });
  });
  describe("Revocation", function () {
    let multiRevocationRequest: MultiRevocationRequest[] = [];
    beforeEach(async function () {
      multiRevocationRequest = [];

      const tx = await gitcoinAttester
        .connect(mockVerifier)
        .submitAttestations([multiAttestationRequest]);
      const attestationResult = await tx.wait();

      // const easInterface = new Interface(eas);

      attestationResult.logs.forEach((log) => {
        const decodedLog = eas.contract.interface.parseLog(log);
        const args = decodedLog?.args;
        if (args) {
          const { uid, ...rest } = decodedLog.args;
          console.log("rest", rest);
          const schema = args[3];
          console.log("schema, uid", schema, uid);
          const value = BigInt(0);
          const existingRevocationRequest = multiRevocationRequest.find(
            (r) => r.schema === schema
          );
          if (existingRevocationRequest) {
            existingRevocationRequest.data.push({
              uid,
              value
            });
          } else {
            multiRevocationRequest.push({
              schema,
              data: [
                {
                  uid,
                  value
                }
              ]
            });
          }
        }
      });
    });
    it("should allow owner to revoke attestations", async function () {
      const revocationTx = await gitcoinAttester
        .connect(mockVerifier)
        .revokeAttestations(multiRevocationRequest);

      const revocationResult = await revocationTx.wait();

      expect(revocationResult.logs).to.not.be.undefined;
      expect(revocationResult.logs).to.not.be.length(0);
      revocationResult.logs.forEach(async (log, i) => {
        const easInterface = eas.contract.interface.parseLog(log);
        expect(easInterface?.args).to.not.be.undefined;
        const schema = easInterface?.args.schema;
        const uid = easInterface?.args.uid;
        expect(schema).to.equal(multiRevocationRequest[0].schema);
        expect(uid).to.equal(multiRevocationRequest[0].data[i].uid);
        // check that each attestation was revoked by uid
        const revokedAttestation = await eas.connect(owner).getAttestation(uid);
        expect(revokedAttestation.revocationTime).to.not.equal(0);
      });
    });
    it("should allow verifier to revoke attestations", async function () {
      const revocationTx = await gitcoinAttester
        .connect(mockVerifier)
        .revokeAttestations(multiRevocationRequest);
      const revocationResult = await revocationTx.wait();
      expect(revocationResult.logs).to.not.be.undefined;
      expect(revocationResult.logs).to.not.be.length(0);
      revocationResult.logs?.forEach(async (log, i) => {
        const parsedLogs = eas.contract.interface.parseLog(log);
        const { schema, uid } = parsedLogs.args;
        expect(schema).to.equal(multiRevocationRequest[0].schema);
        expect(uid).to.equal(multiRevocationRequest[0].data[i].uid);
        // check that each attestation was revoked by uid
        const revokedAttestation = await eas.connect(owner).getAttestation(uid);
        expect(revokedAttestation.revocationTime).to.not.equal(0);
      });
    });
    it("should not allow non-owner to revoke attestations", async function () {
      await expect(
        gitcoinAttester
          .connect(nonOwnerOrVerifier)
          .revokeAttestations(multiRevocationRequest)
      ).to.be.revertedWith(
        "Only authorized verifiers or owner can call this function"
      );
    });
  });
  describe("Pausability", function () {
    it("should pause and unpause", async function () {
      await gitcoinAttester.pause();
      expect(await gitcoinAttester.paused()).to.equal(true);
      await gitcoinAttester.unpause();
      expect(await gitcoinAttester.paused()).to.equal(false);
    });

    it("should revert when paused", async function () {
      await gitcoinAttester.pause();
      await expect(
        gitcoinAttester.submitAttestations([multiAttestationRequest])
      ).to.be.revertedWith("Pausable: paused");
      await gitcoinAttester.unpause();
    });
    it("should not allow non owner to pause", async function () {
      await expect(
        gitcoinAttester.connect(nonOwnerOrVerifier).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
