import {
  Alert,
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
import { useI18n } from "../i18n";

type DeleteConfirmDialogProps = {
  open: boolean;
  selectedCount: number;
  accountName?: string;
  warning?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmDialog({
  open,
  selectedCount,
  accountName,
  warning,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const { t } = useI18n();
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
          <span>
            {accountName ? t("delete.titleOne") : t("delete.titleMany")}
          </span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {accountName
            ? t("delete.bodyNamed", { name: accountName })
            : t("delete.bodySelected", { count: selectedCount })}
        </DialogContentText>
        {warning && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {warning}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} sx={{ color: "text.secondary" }}>
          {t("common.cancel")}
        </Button>
        <Button
          color="error"
          variant="contained"
          startIcon={<FaTrashAlt size={13} />}
          onClick={onConfirm}
        >
          {t("common.delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
