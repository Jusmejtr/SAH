import { Button, Checkbox, FormControlLabel, IconButton, Stack } from "@mui/material";
import { FaCog } from "react-icons/fa";
import { useState } from "preact/hooks";
import AddDialog from "./manage-account/AddDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import SettingsDialog from "./SettingsDialog";
import type { NewAccount } from "../api";

type NavProps = {
  onAdd: (account: NewAccount) => Promise<void>;
  manageMode: boolean;
  onToggleManage: () => void;
  selectedCount: number;
  onSelectAll: () => void;
  onDeleteSelected: () => Promise<void>;
  allSelected: boolean;
};

export default function Nav({
  onAdd,
  manageMode,
  onToggleManage,
  selectedCount,
  onSelectAll,
  onDeleteSelected,
  allSelected,
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
    <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", flexWrap: "wrap" }}
      >
        <AddDialog onAdd={onAdd} />
        <Button
          variant={manageMode ? "contained" : "outlined"}
          onClick={onToggleManage}
        >
          {manageMode ? "Exit Manage" : "Manage"}
        </Button>
        <IconButton aria-label="settings" onClick={() => setSettingsOpen(true)}>
          <FaCog />
        </IconButton>
      </Stack>
      {manageMode && (
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <FormControlLabel
            control={<Checkbox checked={allSelected} onChange={onSelectAll} />}
            label="Select All"
          />
          <Button
            variant="contained"
            color="error"
            disabled={selectedCount === 0}
            onClick={handleDeleteClick}
          >
            Delete Selected ({selectedCount})
          </Button>
        </Stack>
      )}

      <DeleteConfirmDialog
        open={confirmOpen}
        selectedCount={selectedCount}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmDelete()}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Stack>
  );
}
