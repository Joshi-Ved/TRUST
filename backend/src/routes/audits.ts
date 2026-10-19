import { Router } from "express";

export const auditRouter = Router();

const AUDIT_STORE: any[] = [];

auditRouter.get("/", (_req, res) => {
  res.json({ success: true, data: AUDIT_STORE });
});

auditRouter.get("/order/:orderId", (req, res) => {
  const reports = AUDIT_STORE.filter((r) => r.orderId === req.params.orderId);
  res.json({ success: true, data: reports });
});

auditRouter.post("/", (req, res) => {
  const { id, orderId, url, verdict, summary, authenticityScore, reportHash } = req.body;
  if (!id || !url || !verdict || !reportHash) {
    return res.status(400).json({ success: false, error: "Missing required report fields" });
  }

  const report = {
    id,
    orderId,
    url,
    verdict,
    summary,
    authenticityScore: authenticityScore ?? null,
    reportHash,
    generatedAt: new Date().toISOString(),
  };

  AUDIT_STORE.unshift(report);
  res.status(201).json({ success: true, data: report });
});
