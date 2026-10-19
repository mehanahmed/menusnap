import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Navbar } from "@/components/landingv2/navbar";
import { Footer } from "@/components/landingv2/footer";
import { FreeGuidesClient } from "@/components/guides/FreeGuidesClient";
import { getPublicFreeGuidesAction } from "@/app/actions/free-guides";

export const metadata: Metadata = {
  title: "Free Restaurant Guides & Playbooks | MenuSnap",
  description:
    "Download free restaurant menu pricing guides, food costing templates, and marketing playbooks to grow your restaurant business in Bangladesh.",
  openGraph: {
    title: "Free Restaurant Guides & Playbooks | MenuSnap",
    description:
      "Download free restaurant menu pricing guides, food costing templates, and marketing playbooks to grow your restaurant business in Bangladesh.",
    url: "https://menusnap.io/free-guide",
    siteName: "MenuSnap",
  },
};

export default async function FreeGuidesPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; ref?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const savedSource = cookieStore.get("landing_source")?.value;

  const fromSource = resolvedParams?.from || resolvedParams?.ref;
  const isParlor =
    fromSource === "parlor" ||
    fromSource === "parlour" ||
    savedSource === "parlor" ||
    savedSource === "parlour";

  const isFromV2 =
    !isParlor &&
    (fromSource === "v2" ||
     savedSource === "v2");

  const landingSource: "v2" | "default" | "parlor" = isParlor
    ? "parlor"
    : isFromV2
    ? "v2"
    : "default";

  const result = await getPublicFreeGuidesAction();
  const guides = result.success && result.data ? result.data : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#FF5A36]/25 selection:text-white overflow-x-clip flex flex-col justify-between">
      <Navbar theme="dark" landingSource={landingSource} />
      <main className="flex-1">
        <FreeGuidesClient initialGuides={guides} />
      </main>
      <Footer landingSource={landingSource} />
    </div>
  );
}
