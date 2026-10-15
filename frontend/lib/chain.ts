import { BrowserProvider, Contract, JsonRpcSigner, encodeBytes32String, isHexString, parseUnits } from "ethers";
import { ERC20_ABI, TRUST_ESCROW_ABI } from "./contracts";
import deployment from "./deployment.json";

export const CHAIN = deployment as {
  network: string;
  chainId: number;
  escrow: string;
  usdc: string;
  icpSigner: string;
};

const CHAIN_PARAMS: Record<number, { chainName: string; rpcUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number } }> = {
  31337: { chainName: "Hardhat Local", rpcUrls: ["http://127.0.0.1:8545"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
  11155111: { chainName: "Sepolia", rpcUrls: ["https://rpc.ankr.com/eth_sepolia"], nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 } },
};

export const ONE_DAY = 86_400;

/** Matches the ICP canister's right-padded utf8 -> bytes32 conversion (max 31 chars). */
export const toOrderIdBytes32 = (orderId: string) => encodeBytes32String(orderId);

export function getEthereum(): any {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No wallet found. Install MetaMask.");
  }
  return (window as any).ethereum;
}

export async function ensureChain() {
  const eth = getEthereum();
  const hexId = "0x" + CHAIN.chainId.toString(16);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (err: any) {
    if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
      const p = CHAIN_PARAMS[CHAIN.chainId];
      if (!p) throw new Error(`Unknown chain ${CHAIN.chainId}`);
      await eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: hexId, ...p }] });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<JsonRpcSigner> {
  const provider = new BrowserProvider(getEthereum());
  await provider.send("eth_requestAccounts", []);
  await ensureChain();
  return new BrowserProvider(getEthereum()).getSigner();
}

const escrowOf = (s: JsonRpcSigner) => new Contract(CHAIN.escrow, TRUST_ESCROW_ABI, s);
const usdcOf = (s: JsonRpcSigner) => new Contract(CHAIN.usdc, ERC20_ABI, s);

export const toRawUsdc = (amount: string) => parseUnits(amount, 6);

export async function getUsdcBalance(signer: JsonRpcSigner): Promise<bigint> {
  return usdcOf(signer).balanceOf(await signer.getAddress());
}

export async function approveUsdc(signer: JsonRpcSigner, raw: bigint): Promise<string> {
  const owner = await signer.getAddress();
  const current: bigint = await usdcOf(signer).allowance(owner, CHAIN.escrow);
  if (current >= raw) return "";
  const tx = await usdcOf(signer).approve(CHAIN.escrow, raw);
  await tx.wait();
  return tx.hash;
}

export async function depositToEscrow(
  signer: JsonRpcSigner,
  orderId: string,
  influencer: string,
  raw: bigint,
  timeoutSeconds = 7 * ONE_DAY
): Promise<string> {
  const tx = await escrowOf(signer).depositFunds(toOrderIdBytes32(orderId), influencer, raw, timeoutSeconds);
  await tx.wait();
  return tx.hash;
}

export async function releaseWithProof(signer: JsonRpcSigner, orderId: string, nonce: number | bigint, signature: string): Promise<string> {
  if (!isHexString(signature, 65)) throw new Error("Malformed settlement signature");
  const tx = await escrowOf(signer).releasePayoutWithIcpProof(toOrderIdBytes32(orderId), nonce, signature);
  await tx.wait();
  return tx.hash;
}

export async function claimRefund(signer: JsonRpcSigner, orderId: string): Promise<string> {
  const tx = await escrowOf(signer).claimRefundAfterTimeout(toOrderIdBytes32(orderId));
  await tx.wait();
  return tx.hash;
}

/** Human-readable revert reason from an ethers error. */
export function errMessage(e: any): string {
  return e?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || "Transaction failed";
}
