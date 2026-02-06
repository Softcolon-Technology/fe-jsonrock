import { ShareType } from "@/app/iterface";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface Props {
  type: ShareType;
  slug: string | null;
  isValid: boolean;
}

const HeaderLogo = ({ type, slug, isValid }: Props) => {
  const onClickNavigation = slug
    ? type === "text"
      ? `/editor/text/${slug}`
      : `/editor/${slug}`
    : "/editor";
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href={onClickNavigation}
        className="flex items-center hover:opacity-80 transition-opacity"
        title="Refresh Page"
      >
        <Image
          width={24}
          height={24}
          src="/jsonrock-dark.svg"
          alt="JSONROCK"
          className={cn(
            "h-5 sm:h-6 w-auto",
            type !== "text" ? "block dark:hidden" : "block",
          )}
        />
        <Image
          width={24}
          height={24}
          src="/jsonrock-light.svg"
          alt="JSONROCK"
          className={cn(
            "h-5 sm:h-6 w-auto",
            type !== "text" ? "hidden dark:block" : "hidden",
          )}
        />
      </Link>
      {!isValid && (
        <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] sm:text-xs font-medium whitespace-nowrap">
          Invalid
        </span>
      )}
    </div>
  );
};

export default HeaderLogo;
