import { handle } from "@/lib/server/api";
import { handleLogout } from "@/lib/server/auth-routes";

export const POST = handle(async (req) => handleLogout(req));
