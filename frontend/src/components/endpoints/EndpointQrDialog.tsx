import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { ContentCopy, Download } from "@mui/icons-material";
import { createEndpointQr } from "../../utils/endpointShare";

interface EndpointQrDialogProps {
  url: string;
  endpointPath: string;
  authenticated: boolean;
  onClose: () => void;
}

export function EndpointQrDialog({ url, endpointPath, authenticated, onClose }: EndpointQrDialogProps) {
  const [image, setImage] = useState<{ source: string; data: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setCopied(false);
    createEndpointQr(url)
      .then((data) => {
        if (!cancelled) setImage({ source: url, data });
      })
      .catch(() => {
        if (!cancelled) setError("二维码生成失败，请复制地址后手动导入。");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const dataUrl = image?.source === url ? image.data : undefined;
  const filename = `endpoint-${endpointPath.split("/").filter(Boolean).join("-") || "root"}.png`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("无法写入剪贴板，请允许浏览器使用剪贴板后重试。");
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="endpoint-qr-title">
      <DialogTitle id="endpoint-qr-title">端点二维码</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
          {endpointPath}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 280, my: 2 }}>
          {dataUrl ? (
            <Box
              component="img"
              src={dataUrl}
              alt="端点访问地址二维码"
              sx={{ display: "block", width: "100%", maxWidth: 320, height: "auto", bgcolor: "common.white" }}
            />
          ) : !error ? (
            <CircularProgress aria-label="正在生成二维码" />
          ) : null}
        </Box>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          扫描二维码可获取端点访问地址，也可复制地址或下载 PNG。
        </Typography>
        {authenticated && <Alert severity="warning">二维码包含访问密钥，请仅分享给获授权的接收方。</Alert>}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          二维码只包含访问地址，不包含端点返回的内容。
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
        <Button onClick={onClose}>关闭</Button>
        <Button onClick={copyUrl} startIcon={<ContentCopy />}>
          {copied ? "已复制" : "复制地址"}
        </Button>
        <Button
          component="a"
          href={dataUrl}
          download={filename}
          disabled={!dataUrl}
          variant="contained"
          startIcon={<Download />}
        >
          下载 PNG
        </Button>
      </DialogActions>
    </Dialog>
  );
}
