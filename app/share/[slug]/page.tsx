import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SharePage({ params }: Props) {
  const resolvedParams = await params;
  // Redirect all /share/[slug] routes to /editor/[slug]
  redirect(`/editor/${resolvedParams.slug}`);
}
