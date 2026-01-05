import { redirect } from "next/navigation";
import { getShareLink } from "@/lib/shareLinks";
import Home from "../../../page"; // Imports app/page.tsx

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ShareTextPage({ params }: Props) {
    const resolvedParams = await params;
    const record = await getShareLink(resolvedParams.slug);

    let initialRecord: any;

    if (record) {
        if (record.isPrivate) {
            record.json = ""; // Strip Content for security
        }
        initialRecord = {
            ...record,
            _id: record._id?.toString(),
            createdAt: record.createdAt.toISOString(),
        };
    } else {
        // New Slug Creation Mode
        initialRecord = {
            slug: resolvedParams.slug,
            type: "text", // Force text type for this route
            json: "",
            mode: "visualize",
            isPrivate: false,
            accessType: "editor", // Allow editing for new slug
            createdAt: new Date().toISOString(),
        };
    }

    return <Home initialRecord={initialRecord} featureMode="text" />;
}
