import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";

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
      elevation={3}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        px: 2,
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      {busy && <CircularProgress size={18} />}
      <Typography
        variant="body2"
        color={busy ? "text.primary" : "text.secondary"}
        noWrap
      >
        {busy ? step || "Working…" : "Idle"}
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      <Button size="small" onClick={onOpenLog}>
        Open log
      </Button>
      <Button size="small" color="error" disabled={!busy} onClick={onCancel}>
        Cancel
      </Button>
    </Paper>
  );
}
