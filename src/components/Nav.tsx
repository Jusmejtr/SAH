import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import {
  FaCheckDouble,
  FaCog,
  FaMoon,
  FaSearch,
  FaSlidersH,
  FaSun,
  FaTimes,
  FaTrashAlt,
} from "react-icons/fa";
import { useState } from "preact/hooks";
import Logo from "./Logo";
import AddDialog from "./manage-account/AddDialog";
import ImportDialog from "./manage-account/ImportDialog";
import ExportDialog from "./manage-account/ExportDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import SettingsDialog from "./SettingsDialog";
import { accentGradient } from "../theme";
import type { ColorMode } from "../theme";
import type { ExportOptions, ExportResult, NewAccount } from "../api";

type NavProps = {
  onAdd: (account: NewAccount) => Promise<void>;
  onImport: (accounts: NewAccount[]) => Promise<void>;
  onExport: (options: ExportOptions) => Promise<ExportResult>;
  manageMode: boolean;
  onToggleManage: () => void;
  selectedCount: number;
  onSelectAll: () => void;
  onDeleteSelected: () => Promise<void>;
  allSelected: boolean;
  accountCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  mode: ColorMode;
  onToggleMode: () => void;
};

export default function Nav({
  onAdd,
  onImport,
  onExport,
  manageMode,
  onToggleManage,
  selectedCount,
  onSelectAll,
  onDeleteSelected,
  allSelected,
  accountCount,
  query,
  onQueryChange,
  mode,
  onToggleMode,
}: NavProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleDeleteClick = () => {
    if (selectedCount > 0) {
      setConfirmOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    await onDeleteSelected();
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={(theme) => ({
          top: 0,
          backdropFilter: "blur(14px)",
          backgroundColor: alpha(
            theme.palette.background.default,
            theme.palette.mode === "dark" ? 0.72 : 0.78,
          ),
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Toolbar
          disableGutters
          sx={{ px: { xs: 2, sm: 3 }, gap: 2, minHeight: { xs: 66, sm: 72 } }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: accentGradient(mode),
            }}
          >
            <Logo size={24} title="Steam Account Helper" />
          </Box>

          <Box sx={{ minWidth: 0, mr: "auto" }}>
            <Typography variant="h6" noWrap sx={{ lineHeight: 1.2 }}>
              Steam Account Helper
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {accountCount === 0
                ? "No accounts stored"
                : `${accountCount} account${accountCount === 1 ? "" : "s"} stored`}
            </Typography>
          </Box>

          {accountCount > 0 && (
            <TextField
              size="small"
              placeholder="Search accounts…"
              value={query}
              onChange={(event) =>
                onQueryChange((event.target as HTMLInputElement).value)
              }
              sx={{ width: { xs: 150, sm: 230 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaSearch size={13} opacity={0.6} />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        aria-label="clear search"
                        onClick={() => onQueryChange("")}
                      >
                        <FaTimes size={12} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          )}

          <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
            <IconButton aria-label="toggle color mode" onClick={onToggleMode}>
              {mode === "dark" ? <FaSun size={16} /> : <FaMoon size={16} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              aria-label="settings"
              onClick={() => setSettingsOpen(true)}
            >
              <FaCog size={16} />
            </IconButton>
          </Tooltip>
        </Toolbar>

        <Divider />

        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.25,
            alignItems: "center",
            flexWrap: "wrap",
            rowGap: 1.25,
          }}
        >
          <AddDialog onAdd={onAdd} />
          <ImportDialog onImport={onImport} />
          <ExportDialog onExport={onExport} />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant={manageMode ? "contained" : "outlined"}
            color={manageMode ? "primary" : "inherit"}
            onClick={onToggleManage}
            startIcon={manageMode ? <FaTimes /> : <FaSlidersH />}
            disabled={accountCount === 0 && !manageMode}
          >
            {manageMode ? "Done" : "Manage"}
          </Button>
        </Stack>

        {manageMode && (
          <>
            <Divider />
            <Stack
              direction="row"
              spacing={1.25}
              sx={(theme) => ({
                px: { xs: 2, sm: 3 },
                py: 1.25,
                alignItems: "center",
                flexWrap: "wrap",
                rowGap: 1.25,
                backgroundColor: alpha(theme.palette.primary.main, 0.07),
              })}
            >
              <Button
                size="small"
                variant="text"
                color="inherit"
                startIcon={<FaCheckDouble />}
                onClick={onSelectAll}
              >
                {allSelected ? "Clear selection" : "Select all"}
              </Button>
              <Chip
                size="small"
                label={`${selectedCount} selected`}
                color={selectedCount > 0 ? "primary" : "default"}
                variant={selectedCount > 0 ? "filled" : "outlined"}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<FaTrashAlt />}
                disabled={selectedCount === 0}
                onClick={handleDeleteClick}
              >
                Delete
              </Button>
            </Stack>
          </>
        )}
      </AppBar>

      <DeleteConfirmDialog
        open={confirmOpen}
        selectedCount={selectedCount}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmDelete()}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
