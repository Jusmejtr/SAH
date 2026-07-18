import { Button } from "@mui/material";
import { render } from "preact";

export function App() {
  return <Button variant="contained">Hello world</Button>;
}

render(<App />, document.getElementById("app")!);
