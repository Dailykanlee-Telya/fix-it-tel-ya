import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tickets",
  title: "Aufträge auflisten",
  description: "List recent repair orders (Aufträge) the signed-in user may see, optionally filtered by status or order number.",
  inputSchema: {
    status: z.string().optional().describe("Optional ticket status, e.g. NEU_EINGANG."),
    search: z.string().optional().describe("Optional partial order number."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 25)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("repair_tickets")
      .select("id, ticket_number, status, created_at, updated_at, estimated_price, final_price")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    if (search) q = q.ilike("ticket_number", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const rows = (data ?? []).map((r) => ({
      id: String(r.id),
      ticket_number: String(r.ticket_number),
      status: String(r.status),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      estimated_price: r.estimated_price == null ? null : Number(r.estimated_price),
      final_price: r.final_price == null ? null : Number(r.final_price),
    }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { tickets: rows } };
  },
});
