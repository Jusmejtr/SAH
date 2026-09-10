import {
  Box,
  Checkbox,
  CircularProgress,
  Typography,
  alpha,
} from "@mui/material";
import { FaCheck, FaPlay } from "react-icons/fa";
import type { Account } from "../api";

type AccountCardProps = {
  account: Account;
  manageMode: boolean;
  selected: boolean;
  busy: boolean;
  onToggleSelect: (id: string) => void;
  onLogin: (id: string) => void;
};

const hueFrom = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return hash;
};

const initialsFrom = (value: string) =>
  value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function AccountCard({
  account,
  manageMode,
  selected,
  busy,
  onToggleSelect,
  onLogin,
}: AccountCardProps) {
  const title = account.displayName || account.username;
  const hue = hueFrom(account.username || account.id);
  const avatarColor = `hsl(${hue} 34% 46%)`;

  const handleActivate = () => {
    if (busy) return;
    if (manageMode) {
      onToggleSelect(account.id);
      return;
    }
    onLogin(account.id);
  };

  return (
    <Box
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-label={manageMode ? `Select ${title}` : `Sign in as ${title}`}
      onClick={handleActivate}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
      sx={(theme) => ({
        position: "relative",
        height: 178,
        p: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.25,
        textAlign: "center",
        cursor: busy ? "default" : "pointer",
        borderRadius: 4,
        overflow: "hidden",
        outline: "none",
        userSelect: "none",
        border: "1px solid",
        borderColor: selected
          ? theme.palette.primary.main
          : theme.palette.divider,
        backgroundColor: selected
          ? alpha(theme.palette.primary.main, 0.08)
          : theme.palette.background.paper,
        transition: "background-color .16s ease, border-color .16s ease",
        "&:hover": busy
          ? undefined
          : {
              borderColor: alpha(theme.palette.primary.main, 0.45),
              backgroundColor: selected
                ? alpha(theme.palette.primary.main, 0.12)
                : alpha(theme.palette.text.primary, 0.04),
            },
        "&:hover .sah-card-action": { opacity: 1 },
        "&:focus-visible": {
          borderColor: theme.palette.primary.main,
        },
      })}
    >
      {manageMode && (
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelect(account.id)}
          onClick={(event) => event.stopPropagation()}
          size="small"
          sx={{ position: "absolute", top: 6, left: 6, zIndex: 2 }}
        />
      )}

      {busy ? (
        <>
          <CircularProgress size={34} thickness={4} />
          <Typography variant="caption" color="text.secondary">
            Signing in…
          </Typography>
        </>
      ) : (
        <>
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              backgroundColor: avatarColor,
              color: "#fff",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "0.02em",
            }}
          >
            {selected ? <FaCheck size={22} /> : initialsFrom(title)}
          </Box>

          <Box sx={{ width: "100%", minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
              title={title}
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: "block" }}
              title={account.username}
            >
              @{account.username}
            </Typography>
          </Box>

          {!manageMode && (
            <Box
              className="sah-card-action"
              sx={(theme) => ({
                position: "absolute",
                bottom: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: theme.palette.text.secondary,
                backgroundColor: alpha(theme.palette.text.primary, 0.08),
                opacity: 0,
                transition: "opacity .16s ease",
                pointerEvents: "none",
              })}
            >
              <FaPlay size={9} />
              Sign in
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
