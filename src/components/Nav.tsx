import { Stack } from "@mui/material";
import AddDialog from "./manage-account/AddDialog";

export default function Nav() {
  return (
    <Stack direction="row" spacing={2}>
      <AddDialog />
    </Stack>
  );
}
