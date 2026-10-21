import {
  Box,
  Checkbox,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import { useState } from "preact/hooks";
import {
  FaCheck,
  FaDownload,
  FaPen,
  FaPlusCircle,
  FaShieldAlt,
  FaTrashAlt,
} from "react-icons/fa";
import type { Account } from "../api";

type AccountCardProps = {
  account: Account;
  manageMode: boolean;
  selected: boolean;
  busy: boolean;
  onToggleSelect: (id: string) => void;
  onLogin: (id: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onShowGuard: (account: Account) => void;
  onSetupGuard: (account: Account) => void;
  onExportMaFile: (account: Account) => void;
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
  onEdit,
  onDelete,
  onShowGuard,
  onSetupGuard,
  onExportMaFile,
}: AccountCardProps) {
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const title = account.displayName || account.username;
  const hue = hueFrom(account.username || account.id);
  const avatarColor = `hsl(${hue} 34% 46%)`;

  const closeMenu = () => setMenuPosition(null);

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    if (busy) return;
    setMenuPosition({ top: event.clientY, left: event.clientX });
  };

  const handleActivate = () => {
    if (busy) return;
    if (manageMode) {
      onToggleSelect(account.id);
      return;
    }
    onLogin(account.id);
  };

  return (
    <>
    <Box
      role="button"
      tabIndex={busy ? -1 : 0}
      onClick={handleActivate}
      onContextMenu={handleContextMenu}
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
        borderRadius: 2,
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

      {account.hasSharedSecret && !manageMode && !busy && (
        <Tooltip title="Steam Guard code" placement="top">
          <IconButton
            className="sah-card-action"
            size="small"
            aria-label="Show Steam Guard code"
            onClick={(event) => {
              event.stopPropagation();
              onShowGuard(account);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 2,
              color: "text.secondary",
              opacity: 0.55,
              transition: "opacity .16s ease, color .16s ease",
              "&:hover, &:focus-visible": {
                opacity: 1,
                color: "primary.main",
              },
            }}
          >
            <FaShieldAlt size={14} />
          </IconButton>
        </Tooltip>
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
        </>
      )}
    </Box>

    <Menu
      open={Boolean(menuPosition)}
      onClose={closeMenu}
      anchorReference="anchorPosition"
      anchorPosition={menuPosition ?? undefined}
    >
      {account.hasSharedSecret ? (
        <MenuItem
          onClick={() => {
            closeMenu();
            onShowGuard(account);
          }}
        >
          <ListItemIcon>
            <FaShieldAlt size={13} />
          </ListItemIcon>
          <ListItemText>Steam Guard code</ListItemText>
        </MenuItem>
      ) : (
        <MenuItem
          onClick={() => {
            closeMenu();
            onSetupGuard(account);
          }}
        >
          <ListItemIcon>
            <FaPlusCircle size={13} />
          </ListItemIcon>
          <ListItemText>Set up Steam Guard…</ListItemText>
        </MenuItem>
      )}
      {account.hasAuthenticator && (
        <MenuItem
          onClick={() => {
            closeMenu();
            onExportMaFile(account);
          }}
        >
          <ListItemIcon>
            <FaDownload size={13} />
          </ListItemIcon>
          <ListItemText>Save maFile…</ListItemText>
        </MenuItem>
      )}
      <MenuItem
        onClick={() => {
          closeMenu();
          onEdit(account);
        }}
      >
        <ListItemIcon>
          <FaPen size={13} />
        </ListItemIcon>
        <ListItemText>Edit</ListItemText>
      </MenuItem>
      <MenuItem
        onClick={() => {
          closeMenu();
          onDelete(account);
        }}
        sx={{ color: "error.main" }}
      >
        <ListItemIcon sx={{ color: "error.main" }}>
          <FaTrashAlt size={13} />
        </ListItemIcon>
        <ListItemText>Delete</ListItemText>
      </MenuItem>
    </Menu>
    </>
  );
}
