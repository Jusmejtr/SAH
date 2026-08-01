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
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => accounts.some((account) => account.id === id)),
    );
  }, [accounts]);

  const handleAdd = async (account: NewAccount) => {
    const created = await addAccount(account);
    setAccounts((prev) => [...prev, created]);
  };

  const handleToggleManage = () => {
    setManageMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === accounts.length && accounts.length > 0) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(accounts.map((account) => account.id));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setError("");

    try {
      let currentAccounts = accounts;
      for (const id of selectedIds) {
        currentAccounts = await removeAccount(id);
      }

      setAccounts(currentAccounts);
      setSelectedIds([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const allSelected =
    accounts.length > 0 && selectedIds.length === accounts.length;

  return (
    <Box>
      <Nav
        onAdd={handleAdd}
        manageMode={manageMode}
        onToggleManage={handleToggleManage}
        selectedCount={selectedIds.length}
        onSelectAll={handleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        allSelected={allSelected}
      />
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
              manageMode={manageMode}
              selected={selectedIds.includes(account.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

render(<App />, document.getElementById("app")!);
