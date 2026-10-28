import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_ticket",
  title: "Auftrag anzeigen",
  description: "Get details of one repair order by its order number, if the signed-in user may see it.",
  inputSchema: { ticket_number: z.string().min(1).describe("Order number, e.g. TEREA260111.") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ ticket_number }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("repair_tickets")
      .select("id, ticket_number, status, created_at, updated_at, error_description_text, work_performed, estimated_price, final_price, kva_required")
      .eq("ticket_number", ticket_number)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Auftrag nicht gefunden");
    const ticket = {
      id: String(data.id),
      ticket_number: String(data.ticket_number),
      status: String(data.status),
      created_at: String(data.created_at),
      updated_at: String(data.updated_at),
      error_description: data.error_description_text ?? null,
      work_performed: data.work_performed ?? null,
      estimated_price: data.estimated_price == null ? null : Number(data.estimated_price),
      final_price: data.final_price == null ? null : Number(data.final_price),
      kva_required: Boolean(data.kva_required),
    };
    return { content: [{ type: "text", text: JSON.stringify(ticket) }], structuredContent: { ticket } };
  },
});
