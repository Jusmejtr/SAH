import { render } from "preact";
import Nav from "./components/Nav";
import AccountCard from "./components/AccountCard";

export function App() {
  return (
    <div>
      <Nav />
      <div style={{ marginTop: "24px" }}>
        <AccountCard
          username="ExampleUser"
          password="********"
          sharedSecret="J4K2..."
          displayName="Examplefafaf User"
        />
      </div>
    </div>
  );
}

render(<App />, document.getElementById("app")!);
