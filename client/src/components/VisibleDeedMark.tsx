import { Check, Heart, Leaf } from "lucide-react";

export function VisibleDeedMark({ className = "" }: { className?: string }) {
  return (
    <div className={`relative grid h-12 w-12 place-items-center rounded-[1.1rem] bg-[#316CFF] text-white shadow-[0_14px_28px_-16px_rgba(49,108,255,0.62)] ${className}`} aria-label="Доброе дело подтверждено">
      <Heart className="h-5 w-5 fill-white/10" strokeWidth={2.2} />
      <Leaf className="absolute right-1.5 top-1.5 h-3 w-3 text-[#DDF75D]" strokeWidth={2.4} />
      <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-[#DDF75D] text-[#182035] ring-2 ring-white"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
    </div>
  );
}
