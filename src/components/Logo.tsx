import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative h-9 w-9 overflow-hidden rounded-xl">
        <Image
          src="/images/logo/icon-blue-bg.png"
          alt=""
          width={518}
          height={518}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">Arisoft</span>
    </div>
  );
}
