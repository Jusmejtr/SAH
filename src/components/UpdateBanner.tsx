import {
  Box,
  Button,
  Collapse,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { FaArrowUp, FaTimes } from "react-icons/fa";
import { installUpdate, openReleasePage } from "../api";
import type { UpdateStatus } from "../api";
import { useI18n } from "../i18n";

type UpdateBannerProps = {
  status: UpdateStatus | null;
  dismissed: boolean;
  onDismiss: () => void;
};

export default function UpdateBanner({
  status,
  dismissed,
  onDismiss,
}: UpdateBannerProps) {
  const { t } = useI18n();
  const state = status?.state;
  const relevant =
    state === "available" || state === "downloading" || state === "downloaded";
  const open = Boolean(relevant) && !dismissed;

  const version = status?.version ?? "";
  const percent = status?.percent ?? 0;

  const message =
    state === "downloaded"
      ? version
        ? t("update.bannerReady", { version })
        : t("update.bannerReadyGeneric")
      : state === "downloading"
        ? version
          ? t("update.bannerDownloading", { version, percent })
          : t("update.bannerDownloadingGeneric", { percent })
        : version
          ? t("update.bannerAvailable", { version })
          : t("update.bannerAvailableGeneric");

  return (
    <Collapse in={open}>
      <Box
        sx={(theme) => ({
          position: "relative",
          px: { xs: 2, sm: 3 },
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        {state === "downloading" && (
          <LinearProgress
            variant="determinate"
            value={status?.percent ?? 0}
            sx={{ position: "absolute", top: 0, left: 0, right: 0 }}
          />
        )}

        <Box sx={{ display: "flex", color: "primary.main" }}>
          <FaArrowUp size={13} />
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 600, mr: "auto" }} noWrap>
          {message}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {state === "downloaded" && (
            <Button
              size="small"
              variant="contained"
              onClick={() => void installUpdate()}
            >
              {t("common.restartInstall")}
            </Button>
          )}
          {state === "available" && (
            <Button
              size="small"
              variant="contained"
              onClick={() => void openReleasePage()}
            >
              {t("common.download")}
            </Button>
          )}
          <IconButton size="small" aria-label={t("update.dismiss")} onClick={onDismiss}>
            <FaTimes size={12} />
          </IconButton>
        </Stack>
      </Box>
    </Collapse>
  );
}
