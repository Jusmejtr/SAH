export type Account = {
  id: string;
  username: string;
  displayName: string;
};

export type NewAccount = {
  username: string;
  password: string;
  sharedSecret: string;
  displayName: string;
};

export type AppSettings = {
  width: number;
  height: number;
  maximize: boolean;
};

type SahApi = {
  listAccounts: () => Promise<Account[]>;
  addAccount: (account: NewAccount) => Promise<Account>;
  removeAccount: (id: string) => Promise<Account[]>;
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: AppSettings) => Promise<AppSettings>;
};

declare global {
  interface Window {
    sah?: SahApi;
  }
}

const getApi = (): SahApi => {
  if (!window.sah) {
    throw new Error("Storage bridge unavailable. Run the app through Electron.");
  }
  return window.sah;
};

export const listAccounts = () => getApi().listAccounts();
export const addAccount = (account: NewAccount) => getApi().addAccount(account);
export const removeAccount = (id: string) => getApi().removeAccount(id);
