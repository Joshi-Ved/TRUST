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

// EIP-6963: wallets announce themselves so we can pick MetaMask even when another
// extension (Phantom, Coinbase, Brave...) has hijacked window.ethereum.
let announced: any[] = [];
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e: any) => {
    if (e?.detail?.provider && !announced.some((d) => d.info?.uuid === e.detail.info?.uuid)) announced.push(e.detail);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function getEthereum(): any {
  if (typeof window === "undefined") throw new Error("Wallet is only available in the browser");
  const metamask = announced.find((d) => d.info?.rdns === "io.metamask");
  if (metamask) return metamask.provider;
  const eth = (window as any).ethereum;
  const legacy = eth?.providers?.find((p: any) => p.isMetaMask);
  if (legacy) return legacy;
  if (eth) return eth;
  if (announced[0]) return announced[0].provider;
  throw new Error("No wallet found. Install the MetaMask extension and reload the page.");
}

const isLocalChain = () => CHAIN.chainId === 31337;

async function localNodeReachable(): Promise<boolean> {
  try {
    const res = await fetch(CHAIN_PARAMS[31337].rpcUrls[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureChain() {
  const eth = getEthereum();
  const hexId = "0x" + CHAIN.chainId.toString(16);
  if ((await eth.request({ method: "eth_chainId" })) === hexId) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (err: any) {
    if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
      const p = CHAIN_PARAMS[CHAIN.chainId];
      if (!p) throw new Error(`Unknown chain ${CHAIN.chainId}`);
      if (isLocalChain() && !(await localNodeReachable())) {
        throw new Error("Local Hardhat node is not running. Start it with `npm run node` in /contracts, then deploy.");
      }
      await eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: hexId, ...p }] });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<JsonRpcSigner> {
  const eth = getEthereum();
  await eth.request({ method: "eth_requestAccounts" });
  await ensureChain();
  return new BrowserProvider(getEthereum()).getSigner();
}

/** Reconnects silently (no popup) if the site was already authorized in MetaMask. */
export async function restoreWallet(): Promise<JsonRpcSigner | null> {
  let eth: any;
  try {
    eth = getEthereum();
  } catch {
    return null;
  }
  const accounts: string[] = await eth.request({ method: "eth_accounts" });
  if (!accounts?.length) return null;
  const chainId = await eth.request({ method: "eth_chainId" });
  if (chainId !== "0x" + CHAIN.chainId.toString(16)) return null;
  return new BrowserProvider(eth).getSigner();
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
  const code = e?.code ?? e?.info?.error?.code ?? e?.error?.code;
  if (code === 4001 || code === "ACTION_REJECTED") return "Request rejected in MetaMask";
  if (code === -32002) return "A MetaMask request is already pending. Open the MetaMask extension to continue.";
  if (code === "BAD_DATA" || /could not decode result data/i.test(e?.message ?? "")) {
    return `No contract at ${CHAIN.escrow} on this network. Redeploy with \`npm run deploy:local\` in /contracts.`;
  }
  return e?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || "Transaction failed";
}
