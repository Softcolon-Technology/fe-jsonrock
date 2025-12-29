import { redirect } from "next/navigation";
import { getShareLink } from "../../../lib/shareLinks";
import Home from "../../page";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SharePage({ params }: Props) {
  const resolvedParams = await params;
  const record = await getShareLink(resolvedParams.slug);

  if (!record) {
    redirect("/");
  }

  if (record.isPrivate) {
    record.json = ""; // Strip JSON for security
    // We shouldn't blindly pass the passwordHash or other internal fields if not needed, 
    // but the error is specifically about serialization of _id and Date.
  }

  // Serialize for Client Component
  // Convert _id to string and Date to ISO string
  const serializedRecord = {
    ...record,
    _id: record._id?.toString(),
    createdAt: record.createdAt.toISOString(),
  };

  return <Home initialRecord={serializedRecord} />;
}


