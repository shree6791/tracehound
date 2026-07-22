/** Browser → POST /investigate on the app Worker. */
export async function postInvestigate(
  message: string
): Promise<{ answer?: string; error?: string }> {
  const res = await fetch('/investigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = (await res.json()) as { answer?: string; error?: string };
  if (data.error || !res.ok) {
    return { error: data.error ?? `HTTP ${res.status}` };
  }
  return { answer: data.answer ?? '' };
}
