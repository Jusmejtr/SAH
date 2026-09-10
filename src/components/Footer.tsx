import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Typography,
  alpha,
} from "@mui/material";
import { FaRegFileAlt, FaTimes } from "react-icons/fa";

type FooterProps = {
  step: string;
  busy: boolean;
  onCancel: () => void;
  onOpenLog: () => void;
};

export default function Footer({ step, busy, onCancel, onOpenLog }: FooterProps) {
  return (
    <Paper
      square
      elevation={0}
      sx={(theme) => ({
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        px: { xs: 2, sm: 3 },
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        backdropFilter: "blur(14px)",
        backgroundColor: alpha(
          theme.palette.background.paper,
          theme.palette.mode === "dark" ? 0.78 : 0.85,
        ),
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
    >
      {busy && (
        <LinearProgress
          sx={{ position: "absolute", top: 0, left: 0, right: 0 }}
        />
      )}

      {busy ? (
        <CircularProgress size={16} thickness={5} />
      ) : (
        <Box
          sx={(theme) => ({
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: theme.palette.text.disabled,
          })}
        />
      )}

      <Typography
        variant="body2"
        color={busy ? "text.primary" : "text.secondary"}
        noWrap
        sx={{ fontWeight: busy ? 600 : 500 }}
      >
        {busy ? step || "Working…" : "Idle"}
      </Typography>

      <Box sx={{ flexGrow: 1 }} />

      <Button
        size="small"
        color="inherit"
        startIcon={<FaRegFileAlt size={12} />}
        onClick={onOpenLog}
        sx={{ color: "text.secondary" }}
      >
        Log
      </Button>
      <Button
        size="small"
        color="error"
        variant="outlined"
        startIcon={<FaTimes size={12} />}
        disabled={!busy}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </Paper>
  );
}
