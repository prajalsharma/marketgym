import { handle } from "@/lib/server/api";
import { handleLogin } from "@/lib/server/auth-routes";

export const POST = handle(async (req) => handleLogin(req));
