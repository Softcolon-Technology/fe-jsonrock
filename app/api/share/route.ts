import { NextRequest, NextResponse } from "next/server";
import { createShareLink } from "../../../lib/shareLinks";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { json, mode, isPrivate, accessType, password, type, slug } = body as {
      json?: string;
      mode?: "visualize" | "tree" | "formatter";
      isPrivate?: boolean;
      accessType?: "editor" | "viewer";
      password?: string;
      type?: "json" | "text";
      slug?: string;
    };

    if (type === 'text') {
      json = json || "";
    }

    if (typeof json !== "string" || (!json.trim() && type !== 'text')) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Default mode to visualize if not provided (e.g. for text type)
    let effectiveMode = mode;
    if (type === 'text' && !effectiveMode) {
      effectiveMode = "visualize";
    }

    if (!effectiveMode || !["visualize", "tree", "formatter"].includes(effectiveMode)) {
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
      mode: effectiveMode,
      isPrivate: isPrivateFlag,
      accessType,
      password: isPrivateFlag ? password : undefined,
      type: type || 'json',
      slug: slug || ''
    });

    return NextResponse.json({
      slug: record.slug,
      mode: record.mode,
      type: record.type,
      isPrivate: record.isPrivate,
      accessType: record.accessType,
    });
  } catch (error) {
    console.error("Error creating share link", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


