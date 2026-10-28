import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTicketsTool from "./tools/list-tickets";
import getTicketTool from "./tools/get-ticket";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "telya-repariert-de",
  title: "telya.repariert.de",
  version: "0.1.0",
  instructions: "Tools for the Telya repair management system. List and look up repair orders (Aufträge) visible to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTicketsTool, getTicketTool],
});
