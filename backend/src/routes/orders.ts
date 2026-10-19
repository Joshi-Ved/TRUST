import { Router } from "express";

export const orderRouter = Router();

const ORDER_STORE: any[] = [
  {
    id: "ord_sepolia_8841",
    evmTxHash: "0x6f99148d4e929a0fba7a28a2a8909d9c223c3b0dfb2f293b6e709a3cf781a7b9",
    advertiserAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    influencerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    amountUsdcRaw: 1500000000,
    status: "ProofSubmitted",
    liveUrl: "https://x.com/satoshi_vibes/status/1789201948",
    platform: "X / Twitter",
    createdAt: new Date().toISOString(),
    nonce: 1,
  },
];

orderRouter.get("/", (_req, res) => {
  res.json({ success: true, data: ORDER_STORE });
});

orderRouter.post("/", (req, res) => {
  const { id, advertiserAddress, influencerAddress, amountUsdcRaw, evmTxHash } = req.body;
  if (!id || !advertiserAddress || !influencerAddress || !amountUsdcRaw) {
    return res.status(400).json({ success: false, error: "Missing required order fields" });
  }

  const newOrder = {
    id,
    advertiserAddress,
    influencerAddress,
    amountUsdcRaw,
    evmTxHash: evmTxHash || "",
    status: "PaymentVerified",
    createdAt: new Date().toISOString(),
    nonce: 0,
  };

  ORDER_STORE.unshift(newOrder);
  res.status(201).json({ success: true, data: newOrder });
});

orderRouter.patch("/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, disputeReason, signature } = req.body;
  const order = ORDER_STORE.find((o) => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: "Order not found" });

  if (status) order.status = status;
  if (disputeReason) order.disputeReason = disputeReason;
  if (signature) order.signature = signature;

  res.json({ success: true, data: order });
});
