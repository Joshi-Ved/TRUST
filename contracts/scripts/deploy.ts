import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Dev-only ICP signer stand-in (well-known Hardhat account #19). On a real network set ICP_SIGNER_ADDRESS
// to the Ethereum address derived from the canister's t-ECDSA public key.
const DEV_ICP_SIGNER_KEY = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

async function main() {
  const [deployer] = await ethers.getSigners();
  const isLocal = network.name === "localhost" || network.name === "hardhat";

  let usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) {
    const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    // Faucet the first few dev accounts so the UI works immediately
    if (isLocal) {
      const signers = await ethers.getSigners();
      for (const s of signers.slice(0, 5)) await (await usdc.mint(s.address, 100_000n * 1_000_000n)).wait();
    }
    console.log("MockUSDC:", usdcAddress);
  }

  const icpSigner = process.env.ICP_SIGNER_ADDRESS || new ethers.Wallet(DEV_ICP_SIGNER_KEY).address;
  const escrow = await (await ethers.getContractFactory("TrustEscrow")).deploy(usdcAddress, icpSigner);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  console.log("TrustEscrow:", escrowAddress, "| signer:", icpSigner, "| chainId:", chainId.toString());

  const out = path.resolve(__dirname, "../../frontend/lib/deployment.json");
  fs.writeFileSync(out, JSON.stringify({ network: network.name, chainId: Number(chainId), escrow: escrowAddress, usdc: usdcAddress, icpSigner, deployer: deployer.address }, null, 2));
  console.log("Wrote", out);
}

main().catch((e) => { console.error(e); process.exit(1); });
