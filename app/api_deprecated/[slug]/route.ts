import { NextRequest, NextResponse } from "next/server";
import { getShareLink, verifyShareLinkPassword } from "@/lib/shareLinks";

interface Params {
    params: Promise<{
        slug: string;
    }>;
}


export async function GET(req: NextRequest, { params }: Params) {
    const { slug } = await params;

    // Get password from query params
    const searchParams = req.nextUrl.searchParams;
    const password = searchParams.get("password");

    if (!slug) {
        return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    try {
        const record = await getShareLink(slug);

        if (!record) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Security: Check Password if Private
        if (record.isPrivate) {
            if (!password) {
                return NextResponse.json({ error: "Password is required" }, { status: 401 });
            }

            const isValid = await verifyShareLinkPassword(slug, password);
            if (!isValid) {
                return NextResponse.json({ error: "Password is incorrect" }, { status: 401 });
            }
        }

        return NextResponse.json(JSON.parse(record.json));
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
