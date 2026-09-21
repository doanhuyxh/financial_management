import { cookies } from "next/headers";

export default async function getValueCookieServer(cookieName: string): Promise<string> {
	const cookieStore = await cookies();
	return cookieStore.get(cookieName)?.value ?? "";

}