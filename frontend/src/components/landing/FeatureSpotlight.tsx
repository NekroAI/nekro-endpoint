import { Box, Paper, Typography, useTheme } from "@mui/material";
import { ReactNode } from "react";

interface FeatureSpotlightProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export const FeatureSpotlight = ({ icon, title, description }: FeatureSpotlightProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1.5,
        borderColor: "rgba(128, 128, 128, 0.2)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: theme.palette.primary.light,
          boxShadow: `0 4px 20px 0 ${theme.palette.primary.main}20`,
        },
      }}
    >
      <Box
        sx={{
          color: theme.palette.primary.main,
          "& > svg": {
            width: 32,
            height: 32,
          },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" component="h3" fontWeight="bold">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );
};
