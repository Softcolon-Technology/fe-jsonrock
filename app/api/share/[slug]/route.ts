import { NextRequest, NextResponse } from "next/server";
import { verifyShareLinkPassword } from "@/lib/shareLinks";

interface Params {
  params: Promise<{
    slug: string;
  }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { json, mode, isPrivate, accessType, password } = body as {
      json?: string;
      mode?: "visualize" | "tree" | "formatter";
      isPrivate?: boolean;
      accessType?: "editor" | "viewer";
      password?: string;
    };

    if (!json || typeof json !== "string" || !json.trim()) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!mode || !["visualize", "tree", "formatter"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const isPrivateFlag = Boolean(isPrivate);

    // If making it private, password is required
    if (isPrivateFlag && (!password || password.length < 4)) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters for private links" },
        { status: 400 },
      );
    }

    // Constraint: If existing record is Private, it CANNOT be made Public.
    // We need to fetch the existing record to check this.
    const { getShareLink, updateShareLink } = await import("@/lib/shareLinks");
    const existingRecord = await getShareLink(slug);

    if (!existingRecord) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (existingRecord.isPrivate && !isPrivateFlag) {
      return NextResponse.json(
        { error: "Cannot change a private link to public" },
        { status: 400 }
      );
    }

    const success = await updateShareLink(slug, {
      json,
      mode,
      isPrivate: isPrivateFlag,
      accessType,
      password: isPrivateFlag ? password : undefined,
    });

    if (!success) {
      return NextResponse.json({ error: "Link not found or update failed" }, { status: 404 });
    }

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error("Error updating share link", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const isValid = await verifyShareLinkPassword(slug, password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // if valid, we need to fetch the full record and return it.
    // We can't import getShareLink directly if we want to be clean, but we can usage it.
    const { getShareLink } = await import("@/lib/shareLinks");
    const record = await getShareLink(slug);

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({
      json: record.json,
      mode: record.mode,
      isPrivate: record.isPrivate,
      accessType: record.accessType,
    });

  } catch (error) {
    console.error("Error verifying password", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
