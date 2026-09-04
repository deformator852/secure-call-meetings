import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type CallEndedStateProps = {
  title: string;
  description: string;
};

export function CallEndedState({ title, description }: CallEndedStateProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{description}</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>
        Back home
      </Link>
    </div>
  );
}
