import { BrowserProvider, Contract, JsonRpcProvider, JsonRpcSigner, Signer, Wallet, encodeBytes32String, isHexString, parseUnits } from "ethers";
import { ERC20_ABI, TRUST_ESCROW_ABI } from "./contracts";
import deployment from "./deployment.json";

export type AnySigner = JsonRpcSigner | Wallet | Signer;

export interface DevAccount {
  id: string;
  label: string;
  role: "advertiser" | "creator";
  address: string;
  privateKey: string;
}

export const LOCAL_DEV_ACCOUNTS: DevAccount[] = [
  {
    id: "account-0",
    label: "Advertiser (Account #0)",
    role: "advertiser",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    id: "account-1",
    label: "Creator: @satoshi_vibes (Account #1)",
    role: "creator",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    id: "account-2",
    label: "Creator: @defi_builder (Account #2)",
    role: "creator",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    id: "account-3",
    label: "Creator: @eth_narratives (Account #3)",
    role: "creator",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
];

export function getDevSigner(privateKey: string): Wallet {
  const provider = new JsonRpcProvider(RPC_URL, CHAIN.chainId, { staticNetwork: true });
  return new Wallet(privateKey, provider);
}

export const CHAIN = deployment as {
  network: string;
  chainId: number;
  escrow: string;
  usdc: string;
  icpSigner: string;
  deployer: string;
};

const CHAIN_PARAMS: Record<number, { chainName: string; rpcUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number } }> = {
  31337: { chainName: "Hardhat Local", rpcUrls: ["http://127.0.0.1:8545"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
  11155111: { chainName: "Sepolia", rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"], nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 } },
};

/** Read-only RPC for the configured chain (balances without a connected wallet). */
export const RPC_URL = CHAIN_PARAMS[CHAIN.chainId]?.rpcUrls[0] ?? "http://127.0.0.1:8545";
export const EXPLORER_URL = CHAIN.chainId === 11155111 ? "https://sepolia.etherscan.io" : null;

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

const escrowOf = (s: AnySigner) => new Contract(CHAIN.escrow, TRUST_ESCROW_ABI, s as any);
const usdcOf = (s: AnySigner) => new Contract(CHAIN.usdc, ERC20_ABI, s as any);

export const toRawUsdc = (amount: string) => parseUnits(amount, 6);

const TEST_USDC_TARGET = BigInt(10_000) * BigInt(1_000_000);

/**
 * Test funds on connect. Local chain: the dev faucet sets 300 ETH + 10,000 USDC.
 * Sepolia: MockUSDC has an open mint, so the wallet mints its own 10,000 USDC
 * (gas ETH must come from a public Sepolia faucet).
 */
export async function requestTestFunds(signer: AnySigner): Promise<void> {
  const address = await signer.getAddress();
  if (CHAIN.chainId !== 31337) {
    const balance: bigint = await usdcOf(signer).balanceOf(address);
    if (balance >= TEST_USDC_TARGET) return;
    const provider = (signer as any).provider;
    if (provider && (await provider.getBalance(address)) === BigInt(0)) {
      throw new Error("You have 0 Sepolia ETH for gas. Get some free at cloud.google.com/application/web3/faucet/ethereum/sepolia");
    }
    const usdc = new Contract(CHAIN.usdc, ["function mint(address,uint256)"], signer as any);
    await (await usdc.mint(address, TEST_USDC_TARGET - balance)).wait();
    return;
  }
  const res = await fetch("/api/dev/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Faucet request failed");
}

export async function getUsdcBalance(signer: AnySigner): Promise<bigint> {
  return usdcOf(signer).balanceOf(await signer.getAddress());
}

export async function approveUsdc(signer: AnySigner, raw: bigint): Promise<string> {
  const owner = await signer.getAddress();
  const current: bigint = await usdcOf(signer).allowance(owner, CHAIN.escrow);
  if (current >= raw) return "";
  const tx = await usdcOf(signer).approve(CHAIN.escrow, raw);
  await tx.wait();
  return tx.hash;
}

export async function depositToEscrow(
  signer: AnySigner,
  orderId: string,
  influencer: string,
  raw: bigint,
  timeoutSeconds = 7 * ONE_DAY
): Promise<string> {
  const tx = await escrowOf(signer).depositFunds(toOrderIdBytes32(orderId), influencer, raw, timeoutSeconds);
  await tx.wait();
  return tx.hash;
}

export async function releaseWithProof(signer: AnySigner, orderId: string, nonce: number | bigint, signature: string): Promise<string> {
  if (!isHexString(signature, 65)) throw new Error("Malformed settlement signature");
  const tx = await escrowOf(signer).releasePayoutWithIcpProof(toOrderIdBytes32(orderId), nonce, signature);
  await tx.wait();
  return tx.hash;
}

export async function claimRefund(signer: AnySigner, orderId: string): Promise<string> {
  const tx = await escrowOf(signer).claimRefundAfterTimeout(toOrderIdBytes32(orderId));
  await tx.wait();
  return tx.hash;
}

export async function transferUsdc(signer: AnySigner, to: string, raw: bigint): Promise<string> {
  const tx = await usdcOf(signer).transfer(to, raw);
  await tx.wait();
  return tx.hash;
}

export async function transferEth(signer: AnySigner, to: string, amountWei: bigint): Promise<string> {
  const tx = await (signer as any).sendTransaction({ to, value: amountWei });
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
