import { redirect } from 'next/navigation';

export default async function LegacyPunchRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const b = params?.b ? `?b=${encodeURIComponent(String(params.b))}` : '';
  redirect(`/hrm/punch${b}`);
}
