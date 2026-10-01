import { Rocket } from "lucide-react";
import { Button, type ButtonProps } from "../../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { ActivationCard } from "./ActivationCard";

/** Stands in for a publish button while the account is not activated. */
export function ActivationGate({ label = "发布", ...props }: Omit<ButtonProps, "children"> & { label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary" {...props}>
          <Rocket /> <span className="sr-only sm:not-sr-only">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <ActivationCard compact />
      </PopoverContent>
    </Popover>
  );
}
