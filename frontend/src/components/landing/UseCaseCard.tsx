import { Box, Paper, Typography } from "@mui/material";

interface UseCaseCardProps {
  title: string;
  description: string;
  htmlContent: string;
}

export const UseCaseCard = ({ title, description, htmlContent }: UseCaseCardProps) => {
  return (
    <Box sx={{ p: 1, height: "100%" }}>
      <Paper
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "12px",
          border: "1px solid",
          borderColor: "divider",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          "&:hover": {
            transform: "translateY(-6px)",
            boxShadow: (theme) => `0 8px 32px 0 ${theme.palette.primary.main}30`,
          },
        }}
      >
        <Box
          sx={{
            height: "250px",
            m: 1,
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
          }}
        >
          <Box
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            sx={{
              width: "100%",
              height: "100%",
              "& > div": {
                width: "100%",
                height: "100%",
              },
            }}
          />
        </Box>
        <Box sx={{ p: 2, flexGrow: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
