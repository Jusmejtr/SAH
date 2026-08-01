import { useEffect, useState } from "preact/hooks";
import { render } from "preact";
import { Alert, Box, Stack, Typography } from "@mui/material";
import Nav from "./components/Nav";
import AccountCard from "./components/AccountCard";
import { addAccount, listAccounts, removeAccount } from "./api";
import type { Account, NewAccount } from "./api";

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch((err: Error) => setError(err.message));
  }, []);

  const handleAdd = async (account: NewAccount) => {
    const created = await addAccount(account);
    setAccounts((prev) => [...prev, created]);
  };

  const handleRemove = async (id: string) => {
    try {
      setAccounts(await removeAccount(id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Box>
      <Nav onAdd={handleAdd} />
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {accounts.length === 0 ? (
        <Typography sx={{ mt: 3 }} color="text.secondary">
          No accounts yet. Add one to get started.
        </Typography>
      ) : (
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{ mt: 3, flexWrap: "wrap" }}
        >
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onRemove={handleRemove}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

render(<App />, document.getElementById("app")!);
