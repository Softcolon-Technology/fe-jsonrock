import { NextRequest, NextResponse } from "next/server";
import { createShareLink } from "../../../lib/shareLinks";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { json, mode, isPrivate, accessType, password } = body as {
      json?: string;
      mode?: "visualize" | "tree" | "formatter";
      isPrivate?: boolean;
      accessType?: "editor" | "viewer";
      password?: string;
    };

    if (typeof json !== "string" || !json.trim()) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!mode || !["visualize", "tree", "formatter"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const isPrivateFlag = Boolean(isPrivate);

    if (isPrivateFlag && (!password || password.length < 4)) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters for private links" },
        { status: 400 },
      );
    }

    const record = await createShareLink({
      json,
      mode,
      isPrivate: isPrivateFlag,
      accessType,
      password: isPrivateFlag ? password : undefined,
    });

    return NextResponse.json({
      slug: record.slug,
      mode: record.mode,
      isPrivate: record.isPrivate,
      accessType: record.accessType,
    });
  } catch (error) {
    console.error("Error creating share link", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


