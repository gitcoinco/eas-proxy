import { ethers } from "hardhat";
import { expect } from "chai";
import { easEncodeData, Stamp } from "./GitcoinAttester";
import {
  EAS,
  Offchain,
  SchemaEncoder,
  SchemaRegistry,
  Delegated,
  ZERO_BYTES32,
  NO_EXPIRATION,
  ATTEST_TYPE,
  ATTEST_PRIMARY_TYPE,
} from "@ethereum-attestation-service/eas-sdk";
import { providers } from "./providers";

const { BigNumber, utils } = ethers;

const googleStamp = {
  provider: "Google",
  stampHash: "234567890",
};

const facebookStamp = {
  provider: "Facebook",
  stampHash: "234567891",
};

const twitterStamp = {
  provider: "Twitter",
  stampHash: "234567891",
};

const EAS_CONTRACT_ADDRESS = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";
const GITCOIN_VC_SCHEMA =
  "0x853a55f39e2d1bf1e6731ae7148976fbbb0c188a898a233dba61a233d8c0e4a4";

const fee1 = utils.parseEther("0.001").toHexString();
const fee1Less1Wei = utils.parseEther("0.000999999999999999").toHexString();
const fee2 = utils.parseEther("0.002").toHexString();

const badStampHash = utils.keccak256(utils.toUtf8Bytes("badStampHash"));

const num_stamps_to_write_on_chain =
  Number.parseInt(process.env.NUM_STAMPS_TO_WRITE_ON_CHAIN) || 1;

const passportTypes = {
  Stamp: [{ name: "encodedData", type: "bytes" }],
  Passport: [
    { name: "stamps", type: "Stamp[]" },
    { name: "recipient", type: "address" },
    { name: "expirationTime", type: "uint64" },
    { name: "revocable", type: "bool" },
    { name: "refUID", type: "bytes32" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "fee", type: "uint256" },
  ],
};

describe("GitcoinVerifier", function () {
  this.beforeAll(async function () {
    const [owner, iamAccount, recipientAccount] = await ethers.getSigners();
    this.iamAccount = iamAccount;
    this.recipientAccount = recipientAccount;

    // Deploy GitcoinAttester
    const GitcoinAttester = await ethers.getContractFactory("GitcoinAttester");
    this.gitcoinAttester = await GitcoinAttester.deploy();
    await this.gitcoinAttester.setEASAddress(EAS_CONTRACT_ADDRESS);

    // Deploy GitcoinVerifier
    const GitcoinVerifier = await ethers.getContractFactory("GitcoinVerifier");
    this.gitcoinVerifier = await GitcoinVerifier.deploy(
      this.gitcoinAttester.address
    );

    // Add verifier to GitcoinAttester allow-list
    const tx = await this.gitcoinAttester.addVerifier(
      this.gitcoinVerifier.address
    );
    await tx.wait();
  });

  this.beforeEach(async function () {});

  describe("GitcoinVerifier - test different schemas", function () {
    type Passport = {
      stamps: Stamp[];
    };

    const getRandomInt = (max: number) => {
      return Math.floor(Math.random() * max);
    };

    it("should write `NUM_STAMPS_TO_WRITE_ON_CHAIN` stamps passport on-chain", async function () {
      const { r, v, s } = {
        v: 28,
        r: "0x67da05cc6f8eaad2414914d48ce017fbe7f946782a81fe117760d3ee07a7467a",
        s: "0x5b991173c208d0c05850f1851961d7b72d25550ac44a2e1b0843b4f2728985f0",
      };

      const stamps = [];
      for (let j = 0; j < num_stamps_to_write_on_chain; j++) {
        const provider = providers[getRandomInt(providers.length)];
        stamps.push({
          provider,
          stampHash: "0xsome_stamph_ash_" + provider,
        });
      }

      const data = stamps.map((stamp) => {
        return {
          recipient: this.recipientAccount.address, // The recipient of the attestation.
          expirationTime: 0, // The time when the attestation expires (Unix timestamp).
          revocable: true, // Whether the attestation is revocable.
          refUID: ZERO_BYTES32, // The UID of the related attestation.
          data: easEncodeData(stamp), // Custom attestation data.
          value: 0, // An explicit ETH amount to send to the resolver. This is important to prevent accidental user errors.
        };
      });

      const multiAttestRequest = [
        {
          schema: GITCOIN_VC_SCHEMA,
          data: data,
        },
      ];

      const multiAttestation = await this.gitcoinVerifier.multiAttest(
        multiAttestRequest
      );

      const receipt = await multiAttestation.wait();
      expect(receipt.status).to.equal(1);
      expect(receipt.logs.length).to.equal(num_stamps_to_write_on_chain);
      console.log("====> receipt.logs: ", receipt.logs);
      receipt.logs.forEach((retValue: unknown) => {
        console.log("====> retValue: ", retValue);
      });
    });
  });
});
