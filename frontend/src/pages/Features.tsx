import { AllInclusive, CloudDone, DeveloperMode, Rocket, Security, Speed } from "@mui/icons-material";
import { Box, Container, Paper, Skeleton, Stack, Switch, Typography, Divider } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hc } from "hono/client";
import type { z } from "zod";
import type { ApiRoutes } from "../../../src/routes/api";
import type { FeatureSchema } from "../../../src/validators/feature.schema";
import { ReactElement, useState, useEffect } from "react";
import { ArchitectureDiagram } from "@frontend/components/features/ArchitectureDiagram";

// This creates a static TypeScript type from the Zod schema
type Feature = z.infer<typeof FeatureSchema>;

const client = hc<ApiRoutes>("/api");

const featureIcons: { [key: string]: ReactElement } = {
  "e2e-type-safety": <Security />,
  "hybrid-rendering": <AllInclusive />,
  "dev-experience": <DeveloperMode />,
  "production-ready": <CloudDone />,
  "high-performance": <Speed />,
  "one-click-deploy": <Rocket />,
};

async function fetchFeatures(): Promise<Feature[]> {
  const res = await client.features.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch features");
  }
  return res.json();
}

async function updateFeature({ key, enabled }: { key: string; enabled: boolean }): Promise<Feature> {
  const res = await client.features[":key"].$patch({
    param: { key },
    json: { enabled },
  });
  if (!res.ok) {
    throw new Error("Failed to update feature");
  }
  return res.json();
}

export function Features() {
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTrigger, setAnimationTrigger] = useState(0);

  const {
    data: features,
    isLoading,
    isError,
  } = useQuery<Feature[], Error>({
    queryKey: ["features"],
    queryFn: fetchFeatures,
  });

  const updateFeatureMutation = useMutation<Feature, Error, { key: string; enabled: boolean }>({
    mutationFn: updateFeature,
    onSuccess: (updatedFeature) => {
      // Trigger animation
      setAnimationTrigger(Date.now());
      // Optimistically update the query data
      queryClient.setQueryData<Feature[]>(["features"], (oldData) => {
        return oldData?.map((feature) => (feature.key === updatedFeature.key ? updatedFeature : feature)) ?? [];
      });
    },
    // You can add onError for more robust error handling
  });

  useEffect(() => {
    if (animationTrigger === 0) return;

    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1800); // Animation ends at 1.8s, triggering the 0.4s fade-out exit animation.

    return () => clearTimeout(timer);
  }, [animationTrigger]);

  if (isError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography color="error">Failed to load features. Please try again later.</Typography>
      </Container>
    );
  }

  return (
    <Box
      sx={(theme) => ({
        background: theme.pageBackground,
        pt: 4,
        pb: 4,
        minHeight: "calc(100vh - 64px)", // Assumes AppBar height is 64px
      })}
    >
      <Container maxWidth="lg">
        <Paper
          sx={(theme) => ({
            p: { xs: 2, md: 4 },
            position: "relative",
            overflow: "hidden",
            borderRadius: "16px",
            border: "1px solid",
            borderColor: theme.palette.divider,
            backgroundColor: theme.glass.background,
            backdropFilter: "blur(16px) saturate(180%)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.1)",
          })}
        >
          <Typography
            variant="h4"
            component="h1"
            align="center"
            gutterBottom
            sx={(theme) => ({
              fontWeight: "bold",
              background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            })}
          >
            演示台
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mb: 2, maxWidth: "750px", mx: "auto" }}
          >
            这里的每一个开关都代表着我们模板的一项核心能力。拨动它，观察下方数据在架构中的实时流动，直观感受从前端到数据库的完整工作流。
          </Typography>

          <ArchitectureDiagram isAnimating={isAnimating} key={animationTrigger} />

          <Divider sx={{ my: 4 }}>
            <Typography variant="overline">功能控制面板</Typography>
          </Divider>

          <Stack spacing={2}>
            {isLoading
              ? Array.from(new Array(6)).map((_, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={2} sx={{ p: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" width="30%" />
                      <Skeleton variant="text" width="80%" />
                    </Box>
                    <Skeleton variant="rectangular" width={51} height={31} />
                  </Stack>
                ))
              : features?.map((feature) => (
                  <Paper
                    key={feature.key}
                    variant="outlined"
                    sx={(theme) => ({
                      p: 2.5,
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: "center",
                      gap: 2,
                      borderRadius: "12px",
                      transition: "all 0.3s ease-in-out",
                      backgroundColor: "transparent",
                      borderColor: "divider",
                      ...(feature.enabled && {
                        borderColor: theme.palette.primary.light,
                        boxShadow: `0 0 24px ${theme.palette.primary.main}30`,
                      }),
                      "&:hover": {
                        borderColor: theme.palette.primary.light,
                        transform: "translateY(-4px)",
                        boxShadow: `0 8px 24px ${theme.palette.primary.main}40`,
                      },
                    })}
                  >
                    <Box sx={{ color: "primary.main", display: "flex", alignItems: "center", gap: 2 }}>
                      {featureIcons[feature.key] || <Box sx={{ width: 24, height: 24 }} />}
                    </Box>
                    <Box sx={{ flexGrow: 1, textAlign: { xs: "center", sm: "left" } }}>
                      <Typography variant="h6">{feature.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Box>
                    <Switch
                      checked={feature.enabled}
                      onChange={(e) => {
                        updateFeatureMutation.mutate({
                          key: feature.key,
                          enabled: e.target.checked,
                        });
                      }}
                    />
                  </Paper>
                ))}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
