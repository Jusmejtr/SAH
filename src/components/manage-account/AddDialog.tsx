import { useState } from "preact/hooks";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { FaPlus } from "react-icons/fa";

type FormState = {
  username: string;
  password: string;
  sharedSecret: string;
  displayName: string;
};

const initialForm: FormState = {
  username: "",
  password: "",
  sharedSecret: "",
  displayName: "",
};

export default function AddDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const handleChange = (field: keyof FormState) => {
    return (event: { target: { value: string } } | any) => {
      const value = event?.target?.value ?? "";
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  };

  const handleSubmit = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setOpen(false);
    setForm(initialForm);
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
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Add Steam Account</DialogTitle>
        <DialogContent>
          <form id="add-steam-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
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
                required
                fullWidth
              />
              <TextField
                label="Display Name"
                value={form.displayName}
                onChange={handleChange("displayName")}
                fullWidth
              />{" "}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" type="submit" form="add-steam-form">
            Add Account
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
