import { useState } from "preact/hooks";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { FaPlus } from "react-icons/fa";
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
        startIcon={<FaPlus />}
      >
        Add Account
      </Button>
      <Dialog open={open} onClose={close} fullWidth>
        <DialogTitle>Add Steam Account</DialogTitle>
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
                label="Shared Secret"
                type="password"
                value={form.sharedSecret}
                onChange={handleChange("sharedSecret")}
                fullWidth
              />
              <TextField
                label="Display Name"
                value={form.displayName}
                onChange={handleChange("displayName")}
                fullWidth
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            form="add-steam-form"
            disabled={saving}
          >
            Add Account
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
