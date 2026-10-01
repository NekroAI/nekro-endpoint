import { Spinner } from "../ui/skeleton";

export function PageFallback() {
  return (
    <div className="grid h-full place-items-center" aria-busy="true" aria-label="正在加载">
      <Spinner className="size-5" />
    </div>
  );
}
