import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShareTextPage({ params }: Props) {
  const resolvedParams = await params;
  // Redirect all /share/text/[slug] routes to /editor/text/[slug]
  redirect(`/editor/text/${resolvedParams.slug}`);
}
