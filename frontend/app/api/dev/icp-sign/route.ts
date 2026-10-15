import { NextResponse } from "next/server";
import { Wallet } from "ethers";
import { CHAIN } from "@/lib/chain";

/**
 * DEV-ONLY stand-in for the ICP canister's `approve_and_release` t-ECDSA signing.
 * Produces the exact EIP-712 `ReleasePayout` signature that TrustEscrow.sol verifies.
 * Disabled in production: there the real canister (icp-canisters) is the only signer.
 */
const DEV_ICP_SIGNER_KEY =
  process.env.ICP_DEV_SIGNER_KEY || "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev signer disabled in production" }, { status: 404 });
  }

  const { orderIdBytes32, influencer, amountRaw, nonce } = await req.json();
  if (!orderIdBytes32 || !influencer || !amountRaw || nonce == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const wallet = new Wallet(DEV_ICP_SIGNER_KEY);
  if (wallet.address.toLowerCase() !== CHAIN.icpSigner.toLowerCase()) {
    return NextResponse.json({ error: "Dev signer does not match the signer set on the deployed contract" }, { status: 500 });
  }

  const signature = await wallet.signTypedData(
    { name: "TRUST_ESCROW", version: "1.0.0", chainId: CHAIN.chainId, verifyingContract: CHAIN.escrow },
    {
      ReleasePayout: [
        { name: "orderId", type: "bytes32" },
        { name: "influencer", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    },
    { orderId: orderIdBytes32, influencer, amount: BigInt(amountRaw), nonce: BigInt(nonce) }
  );

  return NextResponse.json({ signature });
}
