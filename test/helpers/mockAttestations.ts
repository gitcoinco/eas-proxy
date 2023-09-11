import { ethers } from "hardhat";
import {
  SchemaEncoder,
  ZERO_BYTES32,
  NO_EXPIRATION,
} from "@ethereum-attestation-service/eas-sdk";

export type Stamp = {
  provider: string;
  stampHash: string;
};

export type Score = {
  score: number;
  scorer_id: number;
};

export const easEncodeScore = (score: Score) => {
  const schemaEncoder = new SchemaEncoder("uint32 score,uint32 scorer_id");
  const encodedData = schemaEncoder.encodeData([
    { name: "score", value: score.score, type: "uint32" },
    { name: "scorer_id", value: score.scorer_id, type: "uint32" },
  ]);
  return encodedData;
};

export const easEncodeStamp = (stamp: Stamp) => {
  const schemaEncoder = new SchemaEncoder("bytes32 provider, bytes32 hash");
  let providerValue = ethers.keccak256(ethers.toUtf8Bytes(stamp.provider));

  const encodedData = schemaEncoder.encodeData([
    { name: "provider", value: providerValue, type: "bytes32" },
    { name: "hash", value: providerValue, type: "bytes32" }, // TODO decode hash here
  ]);
  return encodedData;
};

export const encodedData = easEncodeStamp({
  provider: "TestProvider",
  stampHash: "234567890",
});

export const attestationRequest = {
  recipient: "0x4A13F4394cF05a52128BdA527664429D5376C67f",
  expirationTime: NO_EXPIRATION,
  revocable: true,
  data: encodedData,
  refUID: ZERO_BYTES32,
  value: 0,
};

export const gitcoinVCSchema =
  "0x853a55f39e2d1bf1e6731ae7148976fbbb0c188a898a233dba61a233d8c0e4a4";

export const multiAttestationRequest = {
  schema: gitcoinVCSchema,
  data: [attestationRequest, attestationRequest, attestationRequest],
};
