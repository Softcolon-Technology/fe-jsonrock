import { redirect } from "next/navigation";
import Home from "../../page";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SharePage({ params }: Props) {
  const resolvedParams = await params;

  let initialRecord: any;

  try {
    // Fetch from backend API
    const res = await fetch(`${process.env.NODE_BACKEND_URL}/api/share/${resolvedParams.slug}`, {
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();

      initialRecord = {
        slug: data.slug,
        type: data.type || "json",
        json: data.isPrivate ? "" : (typeof data.data === 'string' ? data.data : JSON.stringify(data.data)),
        mode: data.mode || "visualize",
        isPrivate: data.isPrivate || false,
        accessType: data.accessType || "editor",
        createdAt: new Date().toISOString(),
      };
    } else {
      // Record doesn't exist - redirect to home
      redirect("/");
    }
  } catch (error) {
    console.error("Error fetching share link:", error);
    redirect("/");
  }

  return <Home initialRecord={initialRecord} />;
}

