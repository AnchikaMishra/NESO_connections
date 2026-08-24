# Run the local demo

Open PowerShell in this folder and run:

```powershell
npm run dev
```

Open `http://127.0.0.1:3000` in your browser.

To stop the server normally, return to the same terminal and press `Ctrl+C` once.

If the terminal was closed or port 3000 is still occupied, run:

```powershell
npm run dev:stop
```

To stop any previous demo process and start a fresh server:

```powershell
npm run dev:restart
```

Use these `npm` commands directly. Do not prefix them with `npx` and do not run `npx pnpm dev`.

The development server binds to `127.0.0.1`, so it is available only on this computer.
