import { Box, Paper, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { ReactElement } from "react";

interface TechCardProps {
  name: string;
  description: string;
  icon: ReactElement;
  color: string;
}

export const TechCard = ({ name, description, icon, color }: TechCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.3 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <Paper
        elevation={4}
        sx={(theme) => ({
          p: 3,
          height: "100%",
          borderRadius: "16px",
          textAlign: "center",
          transition: "all 0.3s ease-in-out",
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          "&:hover": {
            transform: "translateY(-8px)",
            boxShadow: `0 20px 40px rgba(0,0,0,0.1)`,
            borderColor: color,
          },
        })}
      >
        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: "12px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 80,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: "bold" }}>
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Paper>
    </motion.div>
  );
};
