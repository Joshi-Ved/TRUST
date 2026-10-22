import { NextResponse } from "next/server";
import { Contract, JsonRpcProvider, getAddress, parseEther, toQuantity } from "ethers";
import { CHAIN } from "@/lib/chain";

/**
 * DEV-ONLY faucet for the local Hardhat chain: tops the connected wallet up to
 * 300 test ETH (gas) and 10,000 MockUSDC so transactions work right away.
 */
const RPC_URL = "http://127.0.0.1:8545";
const ETH_TARGET = parseEther("300");
const USDC_TARGET = BigInt(10_000) * BigInt(1_000_000);

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" || CHAIN.chainId !== 31337) {
    return NextResponse.json({ error: "Faucet is only available on the local Hardhat chain" }, { status: 404 });
  }

  let address: string;
  try {
    address = getAddress((await req.json()).address);
  } catch {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const provider = new JsonRpcProvider(RPC_URL, CHAIN.chainId, { staticNetwork: true });
    let fundedEth = false;
    let fundedUsdc = false;

    if ((await provider.getBalance(address)) < ETH_TARGET) {
      await provider.send("hardhat_setBalance", [address, toQuantity(ETH_TARGET)]);
      fundedEth = true;
    }

    // Hardhat node accounts are unlocked, so the deployer can sign the mint.
    const usdc = new Contract(
      CHAIN.usdc,
      ["function mint(address,uint256)", "function balanceOf(address) view returns (uint256)"],
      await provider.getSigner(CHAIN.deployer)
    );
    const usdcBalance: bigint = await usdc.balanceOf(address);
    if (usdcBalance < USDC_TARGET) {
      await (await usdc.mint(address, USDC_TARGET - usdcBalance)).wait();
      fundedUsdc = true;
    }

    return NextResponse.json({ fundedEth, fundedUsdc });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Faucet failed. Is the Hardhat node running on ${RPC_URL}? (${e?.shortMessage || e?.message})` },
      { status: 502 }
    );
  }
}
