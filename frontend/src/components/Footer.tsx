import { Box, Container, Link, Typography, Divider } from "@mui/material";

export const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: "auto",
        backgroundColor: "rgba(0,0,0,0.1)",
      }}
    >
      <Container maxWidth="lg">
        <Divider sx={{ mb: 4 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} NekroEdge Template. Built with ❤️ using Cloudflare.
          </Typography>
          <Box sx={{ display: "flex", gap: 3 }}>
            <Link
              href="https://github.com/NekroAI/nekro-edge-template"
              target="_blank"
              rel="noopener"
              variant="body2"
              color="text.secondary"
            >
              GitHub
            </Link>
            <Link href="https://edge.nekro.ai" target="_blank" rel="noopener" variant="body2" color="text.secondary">
              Demo
            </Link>
            <Link href="https://cloudflare.com" target="_blank" rel="noopener" variant="body2" color="text.secondary">
              Cloudflare
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
