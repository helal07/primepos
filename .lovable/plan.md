# Connect Lovable Project to GitHub and Enable Auto-Sync

## Goal
Link the current Lovable project to `https://github.com/helal07/primepos.git` so every edit in Lovable pushes to GitHub automatically (two-way sync).

## Important Constraints
- GitHub authorization must be done by the repository owner through the Lovable editor UI; the agent cannot authenticate on your behalf.
- Lovable does **not** support importing an existing GitHub repository that already contains code. The target repo should either be empty or created by Lovable during connection. If `primepos.git` already has files, the connection may fail or overwrite content.
- This is a configuration/integration task; no application source files need to be changed.

## Steps

### 1. Open the GitHub connection flow in Lovable
1. Open this project in the Lovable editor.
2. Click the **Plus (+)** menu in the chat input (bottom left).
3. Choose **GitHub → Connect project**.

### 2. Authorize and select the repository
1. Authorize the **Lovable GitHub App** when prompted.
2. Select the `helal07` GitHub account/organization.
3. Choose the repository `primepos`.
   - If the repo does not exist yet, use **Create Repository** in Lovable to create `primepos` under `helal07`.
   - If the repo already exists and contains code, back up that code first, because Lovable may overwrite it.

### 3. Verify sync
1. After connection, Lovable will push the current project code to `helal07/primepos`.
2. Make a small edit in Lovable and confirm the commit appears in the GitHub repository.
3. Once connected, two-way sync is active: Lovable edits push to GitHub, and GitHub pushes sync back to Lovable.

## Rollback / Safety
- Before connecting, clone or download any existing code from `helal07/primepos.git` to avoid accidental loss.
- If the wrong repository gets connected, disconnect in Lovable and reconnect to the correct one.
