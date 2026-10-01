import { Page, PageHeader } from "./Page";

export function Placeholder({ title }: { title: string }) {
  return (
    <Page>
      <PageHeader eyebrow="/app" title={title} description="此页面正在迁移到新的界面。" />
    </Page>
  );
}
