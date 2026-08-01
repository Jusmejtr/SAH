import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type DeleteConfirmDialogProps = {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmDialog({
  open,
  selectedCount,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete selected accounts?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {selectedCount === 1
            ? "This will permanently delete 1 selected account."
            : `This will permanently delete ${selectedCount} selected accounts.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
