import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const DAY = 24 * 60 * 60;
const AMOUNT = 1_500n * 1_000_000n;
const orderId = ethers.encodeBytes32String("ord_test_0001");

async function setup() {
  const [deployer, advertiser, influencer, stranger] = await ethers.getSigners();
  const icp = ethers.Wallet.createRandom(); // stands in for the canister's t-ECDSA key

  const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
  const escrow = await (await ethers.getContractFactory("TrustEscrow")).deploy(await usdc.getAddress(), icp.address);

  await usdc.mint(advertiser.address, AMOUNT * 10n);
  await usdc.connect(advertiser).approve(await escrow.getAddress(), ethers.MaxUint256);

  const { chainId } = await ethers.provider.getNetwork();
  const domain = { name: "TRUST_ESCROW", version: "1.0.0", chainId, verifyingContract: await escrow.getAddress() };
  const types = {
    ReleasePayout: [
      { name: "orderId", type: "bytes32" },
      { name: "influencer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const sign = (signer: ethers.Wallet, nonce: bigint, amount = AMOUNT, inf = influencer.address) =>
    signer.signTypedData(domain, types, { orderId, influencer: inf, amount, nonce });

  return { deployer, advertiser, influencer, stranger, icp, usdc, escrow, sign };
}

describe("TrustEscrow", () => {
  it("locks funds on deposit", async () => {
    const { advertiser, influencer, usdc, escrow } = await setup();
    await expect(escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY))
      .to.emit(escrow, "EscrowFunded");
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
    expect((await escrow.getEscrowDetails(orderId)).status).to.equal(1n);
  });

  it("rejects duplicate orders, self-dealing, short timeouts, zero amounts", async () => {
    const { advertiser, influencer, escrow } = await setup();
    const e = escrow.connect(advertiser);
    await e.depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    await expect(e.depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY)).to.be.revertedWith("TrustEscrow: order already exists");
    const id2 = ethers.encodeBytes32String("o2");
    await expect(e.depositFunds(id2, advertiser.address, AMOUNT, 7 * DAY)).to.be.revertedWith("TrustEscrow: advertiser cannot be influencer");
    await expect(e.depositFunds(id2, influencer.address, AMOUNT, DAY - 1)).to.be.revertedWith("TrustEscrow: timeout duration must be >= 1 day");
    await expect(e.depositFunds(id2, influencer.address, 0, 7 * DAY)).to.be.revertedWith("TrustEscrow: deposit amount must be > 0");
  });

  it("releases to the influencer with a valid ICP signature (anyone can relay)", async () => {
    const { advertiser, influencer, stranger, icp, usdc, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    const sig = await sign(icp, 1n);
    await expect(escrow.connect(stranger).releasePayoutWithIcpProof(orderId, 1n, sig))
      .to.emit(escrow, "EscrowReleased").withArgs(orderId, influencer.address, AMOUNT, icp.address);
    expect(await usdc.balanceOf(influencer.address)).to.equal(AMOUNT);
    expect((await escrow.getEscrowDetails(orderId)).status).to.equal(2n);
  });

  it("rejects signatures from the wrong key, wrong amount, or wrong recipient", async () => {
    const { advertiser, influencer, stranger, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    const attacker = ethers.Wallet.createRandom();
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(attacker, 1n)))
      .to.be.revertedWith("TrustEscrow: invalid ICP t-ECDSA signature");
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(attacker, 1n, AMOUNT * 2n)))
      .to.be.revertedWith("TrustEscrow: invalid ICP t-ECDSA signature");
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(attacker, 1n, AMOUNT, stranger.address)))
      .to.be.revertedWith("TrustEscrow: invalid ICP t-ECDSA signature");
  });

  it("cannot release twice or replay after refund", async () => {
    const { advertiser, influencer, icp, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    await escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(icp, 1n));
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(icp, 1n))).to.be.revertedWith("TrustEscrow: deposit not funded or already finalized");
    await expect(escrow.releasePayoutWithIcpProof(orderId, 2n, await sign(icp, 2n))).to.be.revertedWith("TrustEscrow: deposit not funded or already finalized");
  });

  it("refunds the advertiser only after timeout", async () => {
    const { advertiser, influencer, stranger, usdc, escrow } = await setup();
    const before = await usdc.balanceOf(advertiser.address);
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    await expect(escrow.connect(advertiser).claimRefundAfterTimeout(orderId)).to.be.revertedWith("TrustEscrow: refund lock timer has not expired");
    await time.increase(7 * DAY + 1);
    await expect(escrow.connect(stranger).claimRefundAfterTimeout(orderId)).to.be.revertedWith("TrustEscrow: only advertiser can claim timeout refund");
    await expect(escrow.connect(advertiser).claimRefundAfterTimeout(orderId)).to.emit(escrow, "EscrowRefunded");
    expect(await usdc.balanceOf(advertiser.address)).to.equal(before);
  });

  it("only owner can rotate signer", async () => {
    const { stranger, escrow } = await setup();
    await expect(escrow.connect(stranger).updateIcpSignerThresholdAddress(stranger.address)).to.be.revertedWith("TrustEscrow: caller is not the owner");
  });
});
