import { SITE_URL } from "@/lib/site";
import { MessageIcon } from "@/components/icons";

export function ShareWhatsApp({ path, text }: { path: string; text: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(`${text} ${SITE_URL}${path}`)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
    >
      <MessageIcon className="h-4 w-4 text-[#25D366]" />
      Share on WhatsApp
    </a>
  );
}
