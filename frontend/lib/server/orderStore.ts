import { INITIAL_ORDERS, type Order } from "@/lib/icp-agent";
import { readJson, updateJson } from "./jsonStore";

const FILE = "orders.json";

export const readOrders = () => readJson<Order[]>(FILE, INITIAL_ORDERS);

export const updateOrders = (update: (all: Order[]) => Order[]) => updateJson<Order[]>(FILE, INITIAL_ORDERS, update);

export const patchOrder = (orderId: string, patch: (o: Order) => Order) =>
  updateOrders((all) => all.map((o) => (o.orderId === orderId ? patch(o) : o)));
