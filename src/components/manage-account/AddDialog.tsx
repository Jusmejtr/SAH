import { useState } from "preact/hooks";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  alpha,
} from "@mui/material";
import { FaPlus, FaUserPlus } from "react-icons/fa";
import type { NewAccount } from "../../api";

type FormState = NewAccount;

type AddDialogProps = {
  onAdd: (account: NewAccount) => Promise<void>;
};

const initialForm: FormState = {
  username: "",
  password: "",
  sharedSecret: "",
  displayName: "",
};

export default function AddDialog({ onAdd }: AddDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    setForm(initialForm);
    setError("");
  };

  const handleChange = (field: keyof FormState) => {
    return (event: { target: { value: string } } | any) => {
      const value = event?.target?.value ?? "";
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  };

  const handleSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onAdd(form);
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setOpen(true)}
        startIcon={<FaPlus size={12} />}
      >
        Add account
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={(theme) => ({
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                color: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              })}
            >
              <FaUserPlus size={17} />
            </Box>
            <span>Add Steam account</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <form id="add-steam-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Username"
                value={form.username}
                onChange={handleChange("username")}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                required
                fullWidth
              />
              <TextField
                label="Shared secret"
                type="password"
                value={form.sharedSecret}
                onChange={handleChange("sharedSecret")}
                required
                fullWidth
                helperText="Used to generate Steam Guard codes automatically."
              />
              <TextField
                label="Display name"
                value={form.displayName}
                onChange={handleChange("displayName")}
                fullWidth
                helperText="Optional label shown on the account card."
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={close}
            disabled={saving}
            color="inherit"
            sx={{ color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            form="add-steam-form"
            disabled={saving}
            startIcon={
              saving ? <CircularProgress size={14} color="inherit" /> : <FaPlus size={12} />
            }
          >
            {saving ? "Adding…" : "Add account"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
