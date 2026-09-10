import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  alpha,
} from "@mui/material";
import { FaExclamationTriangle, FaTrashAlt } from "react-icons/fa";

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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={(theme) => ({
              width: 38,
              height: 38,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              color: theme.palette.error.main,
              backgroundColor: alpha(theme.palette.error.main, 0.12),
            })}
          >
            <FaExclamationTriangle size={17} />
          </Box>
          <span>Delete selected accounts?</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {selectedCount === 1
            ? "This will permanently delete 1 selected account. This action cannot be undone."
            : `This will permanently delete ${selectedCount} selected accounts. This action cannot be undone.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          startIcon={<FaTrashAlt size={13} />}
          onClick={onConfirm}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
