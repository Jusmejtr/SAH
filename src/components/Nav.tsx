import { Stack } from "@mui/material";
import AddDialog from "./manage-account/AddDialog";
import type { NewAccount } from "../api";

type NavProps = {
  onAdd: (account: NewAccount) => Promise<void>;
};

export default function Nav({ onAdd }: NavProps) {
  return (
    <Stack direction="row" spacing={2}>
      <AddDialog onAdd={onAdd} />
    </Stack>
  );
}
