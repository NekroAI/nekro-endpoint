import type { SVGProps } from "react";
import type { EndpointType } from "../../../../common/types";

/**
 * Endpoint type glyphs (docs/REDESIGN.md §2.7). Drawn on a 16px grid with
 * currentColor so the same mark works in the map, lists and headers.
 */
type GlyphProps = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true } as const;

export function StaticGlyph(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="10" height="10" rx="2.5" fill="currentColor" />
    </svg>
  );
}

export function ProxyGlyph(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 8h11.5m0 0-2.5-2.5M13 8l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DynamicProxyGlyph(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 8h4.5M6.5 8 11 3.5M6.5 8H11M6.5 8 11 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12.75" cy="3.5" r="1.4" fill="currentColor" />
      <circle cx="12.75" cy="8" r="1.4" fill="currentColor" />
      <circle cx="12.75" cy="12.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function ScriptGlyph(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M5.5 2.75c-1.5 0-2 .6-2 1.9v1.6c0 .9-.5 1.5-1.5 1.75 1 .25 1.5.85 1.5 1.75v1.6c0 1.3.5 1.9 2 1.9M10.5 2.75c1.5 0 2 .6 2 1.9v1.6c0 .9.5 1.5 1.5 1.75-1 .25-1.5.85-1.5 1.75v1.6c0 1.3-.5 1.9-2 1.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DirectoryGlyph(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.5 2.5 5.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export const typeGlyph: Record<EndpointType, (props: GlyphProps) => JSX.Element> = {
  static: StaticGlyph,
  proxy: ProxyGlyph,
  dynamicProxy: DynamicProxyGlyph,
  script: ScriptGlyph,
};

export const typeMeta: Record<EndpointType, { label: string; summary: string; example: string }> = {
  static: { label: "静态", summary: "托管一段文本或配置文件，原样返回", example: "JSON 或 YAML 配置、文本片段、Markdown" },
  proxy: { label: "代理", summary: "把请求转发到一个固定的目标地址", example: "为某个 API 加一层鉴权或缓存入口" },
  dynamicProxy: {
    label: "动态代理",
    summary: "把子路径映射到目标站点，整站转发",
    example: "加速 raw.githubusercontent.com 下的任意文件",
  },
  script: { label: "脚本", summary: "运行自定义脚本生成响应（即将推出）", example: "按请求参数动态拼装内容" },
};

export function TypeGlyph({ type, ...props }: GlyphProps & { type: EndpointType }) {
  const Glyph = typeGlyph[type] ?? StaticGlyph;
  return <Glyph {...props} />;
}
