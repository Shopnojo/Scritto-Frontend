import { redirect } from "next/navigation";
import { DEFAULT_AUTHED_PATH } from "@/lib/auth/auth-utils";

/** Entry point: the dashboard guard sends signed-out visitors on to /login. */
export default function Home() {
  redirect(DEFAULT_AUTHED_PATH);
}
