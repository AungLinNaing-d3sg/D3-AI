import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
}

/** Brand wordmark — uses the company's existing logo asset (public/). */
export function Logo({ className = "" }: LogoProps) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`.trim()} aria-label="D3-SG home">
      <Image
        src="/D3SG-logo.png"
        alt="D3-SG"
        width={180}
        height={56}
        priority
        className="h-8 w-auto sm:h-9"
      />
    </Link>
  );
}
