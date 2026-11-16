import { handle } from "@/lib/server/api";
import { handleSignup } from "@/lib/server/auth-routes";

export const POST = handle(async (req) => handleSignup(req));
