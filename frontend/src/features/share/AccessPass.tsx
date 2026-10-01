import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useState, type PointerEvent } from "react";
import { createEndpointQr } from "../../utils/endpointShare";
import { BrandMark } from "../../design/brand";
import { cn } from "../../lib/cn";

export type PassInfo = {
  url: string;
  path: string;
  username: string;
  /** Present for protected endpoints. */
  keyValue?: string;
  groupName?: string;
  note?: string | null;
  expiresAt?: string | null;
};

/**
 * The Access Pass: a physical-feeling card with the endpoint's QR code.
 * It is deliberately dark in both themes, like a printed card. The QR code is
 * generated locally (utils/endpointShare) and never leaves the browser.
 */
export function AccessPass({ info, flipped, onFlip }: { info: PassInfo; flipped: boolean; onFlip: () => void }) {
  const qr = useQr(info.url);
  const protectedPass = Boolean(info.keyValue);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });
  const sheenX = useTransform(px, [0, 1], ["0%", "100%"]);
  const sheenY = useTransform(py, [0, 1], ["0%", "100%"]);
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${sheenX} ${sheenY}, rgb(255 255 255 / 0.13), transparent 45%)`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div className="[perspective:1200px]" onPointerMove={onMove} onPointerLeave={reset}>
      <motion.div style={{ rotateX, rotateY }} className="relative mx-auto aspect-[1.586] w-full max-w-[460px] [transform-style:preserve-3d]">
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 [transform-style:preserve-3d]"
        >
          {/* Front */}
          <button
            type="button"
            onClick={onFlip}
            aria-label="翻到背面查看调用方式"
            className="absolute inset-0 overflow-hidden rounded-[18px] p-px text-left [container-type:inline-size] [backface-visibility:hidden]"
            style={{ background: "linear-gradient(135deg,#8a2be2,#4a90e2 50%,#50e3c2)" }}
          >
            <div className="relative flex h-full gap-4 overflow-hidden rounded-[17px] bg-[#0c0f14] p-[5%] text-[#eef1f6]">
              <div
                className="pointer-events-none absolute -top-1/2 -right-1/4 size-[120%] rounded-full opacity-50 blur-3xl"
                style={{ background: protectedPass ? "rgb(155 92 255 / 0.25)" : "rgb(80 227 194 / 0.18)" }}
              />
              <div className="relative flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <BrandMark className="size-5" />
                  <span className="font-mono text-[10px] font-semibold tracking-[0.2em] whitespace-nowrap text-[#b4bbc8]">
                    {protectedPass ? "ACCESS PASS" : "PUBLIC LINK"}
                  </span>
                </div>
                <div className="mt-auto min-w-0">
                  <div className="font-mono text-[10px] text-[#7c8494]">/e/{info.username}</div>
                  <div className="truncate font-mono text-[clamp(14px,4.2cqw,20px)] leading-tight font-semibold" title={info.path}>
                    {info.path}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                    {protectedPass ? (
                      <>
                        <Meta label="权限组" value={info.groupName ?? "—"} />
                        <Meta label="密钥" value={`•••• ${info.keyValue!.slice(-4)}`} mono />
                        <Meta label="有效期" value={info.expiresAt ? new Date(info.expiresAt).toLocaleDateString("zh-CN") : "永久"} />
                        <Meta label="备注" value={info.note || "—"} />
                      </>
                    ) : (
                      <div className="col-span-2">
                        <Meta label="访问" value="任何人可访问" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative grid aspect-square h-full max-h-full shrink-0 place-items-center self-center rounded-xl bg-white p-[3%]">
                {qr ? <img src={qr} alt="访问地址二维码" className="size-full [image-rendering:pixelated]" /> : <div className="size-full animate-pulse rounded bg-neutral-200" />}
              </div>
              <motion.div className="pointer-events-none absolute inset-0 rounded-[17px] mix-blend-screen" style={{ background: sheen }} />
            </div>
          </button>

          {/* Back */}
          <button
            type="button"
            onClick={onFlip}
            aria-label="翻回正面"
            className="absolute inset-0 overflow-hidden rounded-[18px] bg-[#0c0f14] p-[5%] text-left text-[#eef1f6] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <div className="flex h-full flex-col gap-2 font-mono text-[10.5px] leading-relaxed">
              <span className="text-[10px] tracking-[0.2em] text-[#7c8494]">HOW TO CALL</span>
              <code className="block rounded-md bg-white/5 p-2 break-all text-[#50e3c2]">
                curl {protectedPass ? `-H "X-Access-Key: ${maskForCard(info.keyValue!)}" ` : ""}
                {stripKey(info.url)}
              </code>
              {protectedPass && (
                <code className="block rounded-md bg-white/5 p-2 break-all text-[#b4bbc8]">{maskUrl(info.url)}</code>
              )}
              <span className="mt-auto text-[10px] text-[#7c8494]">点击卡片翻回正面 · 完整密钥请使用复制按钮</span>
            </div>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[#7c8494]">{label}</div>
      <div className={cn("truncate text-[#dfe4ec]", mono && "font-mono")}>{value}</div>
    </div>
  );
}

const maskForCard = (key: string) => `${key.slice(0, 5)}…${key.slice(-4)}`;
const stripKey = (url: string) => {
  const parsed = new URL(url);
  parsed.searchParams.delete("access_key");
  return parsed.toString();
};
const maskUrl = (url: string) => {
  const parsed = new URL(url);
  const key = parsed.searchParams.get("access_key");
  return key ? url.replace(key, maskForCard(key)) : url;
};

export function useQr(url: string) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setQr(null);
    createEndpointQr(url)
      .then((data) => alive && setQr(data))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [url]);
  return qr;
}

/** Renders the pass front to a PNG locally (no network) and downloads it. */
export async function downloadPass(info: PassInfo) {
  const qrData = await createEndpointQr(info.url);
  const scale = 2;
  const width = 860;
  const height = Math.round(width / 1.586);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const radius = 34;
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const border = ctx.createLinearGradient(0, 0, width, height);
  border.addColorStop(0, "#8a2be2");
  border.addColorStop(0.5, "#4a90e2");
  border.addColorStop(1, "#50e3c2");
  roundRect(0, 0, width, height, radius);
  ctx.fillStyle = border;
  ctx.fill();
  roundRect(2, 2, width - 4, height - 4, radius - 2);
  ctx.fillStyle = "#0c0f14";
  ctx.fill();

  const pad = 44;
  const qrSize = height - pad * 2;
  const qrX = width - pad - qrSize;
  roundRect(qrX, pad, qrSize, qrSize, 22);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  const image = new Image();
  image.src = qrData;
  await image.decode();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, qrX + 12, pad + 12, qrSize - 24, qrSize - 24);

  const mono = '"Geist Mono Variable", ui-monospace, Menlo, monospace';
  const sans = '"Geist Variable", "PingFang SC", system-ui, sans-serif';
  ctx.fillStyle = "#b4bbc8";
  ctx.font = `600 15px ${mono}`;
  ctx.fillText(info.keyValue ? "ACCESS PASS · ENDPOINTS" : "PUBLIC LINK · ENDPOINTS", pad, pad + 16);

  const textWidth = qrX - pad * 2;
  ctx.fillStyle = "#7c8494";
  ctx.font = `15px ${mono}`;
  ctx.fillText(`/e/${info.username}`, pad, height - pad - 120);
  ctx.fillStyle = "#eef1f6";
  ctx.font = `600 32px ${mono}`;
  let path = info.path;
  while (ctx.measureText(path).width > textWidth && path.length > 4) path = `…${path.slice(2)}`;
  ctx.fillText(path, pad, height - pad - 80);

  ctx.font = `15px ${sans}`;
  const rows: [string, string][] = info.keyValue
    ? [
        ["权限组", info.groupName ?? "—"],
        ["密钥", `•••• ${info.keyValue.slice(-4)}`],
        ["有效期", info.expiresAt ? new Date(info.expiresAt).toLocaleDateString("zh-CN") : "永久"],
      ]
    : [["访问", "任何人可访问"]];
  rows.forEach(([label, value], index) => {
    const x = pad + index * Math.min(170, textWidth / rows.length);
    ctx.fillStyle = "#7c8494";
    ctx.fillText(label, x, height - pad - 30);
    ctx.fillStyle = "#dfe4ec";
    ctx.fillText(value, x, height - pad - 6);
  });

  const link = document.createElement("a");
  link.download = `pass-${info.path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "endpoint"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
