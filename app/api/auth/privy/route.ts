import { handle } from "@/lib/server/api";
import { handlePrivyLogin } from "@/lib/server/auth-routes";

export const POST = handle(async (req) => handlePrivyLogin(req));
