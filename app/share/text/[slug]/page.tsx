import { redirect } from "next/navigation";
import Home from "../../../page"; // Imports app/page.tsx

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ShareTextPage({ params }: Props) {
    const resolvedParams = await params;

    let initialRecord: any;

    try {
        // Fetch from backend API instead of using deprecated lib
        const res = await fetch(`${process.env.NODE_BACKEND_URL}/api/share/${resolvedParams.slug}`, {
            cache: 'no-store'
        });

        if (res.ok) {
            const data = await res.json();

            // Backend returns { data, type, slug, isPrivate, accessType, mode }
            initialRecord = {
                slug: data.slug,
                type: data.type || "text",
                json: data.isPrivate ? "" : (typeof data.data === 'string' ? data.data : JSON.stringify(data.data)),
                mode: data.mode || "visualize",
                isPrivate: data.isPrivate || false,
                accessType: data.accessType || "editor",
                createdAt: new Date().toISOString(),
            };
        } else {
            // Record doesn't exist - create new
            initialRecord = {
                slug: resolvedParams.slug,
                type: "text",
                json: "",
                mode: "visualize",
                isPrivate: false,
                accessType: "editor",
                createdAt: new Date().toISOString(),
            };
        }
    } catch (error) {
        console.error("Error fetching share link:", error);
        // Fallback to new slug creation on error
        initialRecord = {
            slug: resolvedParams.slug,
            type: "text",
            json: "",
            mode: "visualize",
            isPrivate: false,
            accessType: "editor",
            createdAt: new Date().toISOString(),
        };
    }

    return <Home initialRecord={initialRecord} featureMode="text" />;
}
