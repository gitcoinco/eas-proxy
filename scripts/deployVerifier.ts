// This script deals with deploying the GitcoinVerifier on a given network

import hre from "hardhat";
import {
  confirmContinue,
  assertEnvironment,
  transferOwnershipToMultisig,
} from "./lib/utils";
import { deployVerifier } from "./lib/verifier";

assertEnvironment();

export async function main() {
  if (!process.env.GITCOIN_ATTESTER_ADDRESS) {
    console.error("Please set your GITCOIN_ATTESTER_ADDRESS in a .env file");
  }

  if (!process.env.IAM_ISSUER_ADDRESS) {
    console.error("Please set your IAM_ISSUER_ADDRESS in a .env file");
  }

  if (!process.env.PASSPORT_MULTISIG_ADDRESS) {
    console.error("Please set your PASSPORT_MULTISIG_ADDRESS in a .env file");
  }

  await confirmContinue({
    contract: "GitcoinVerifier",
    network: hre.network.name,
    chainId: hre.network.config.chainId,
  });

  const deployment = await deployVerifier(process.env.GITCOIN_ATTESTER_ADDRESS);

  transferOwnershipToMultisig(deployment);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
