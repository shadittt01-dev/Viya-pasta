# Putting Via Pasta online with Vercel (free)

The full site runs on Vercel: menu, cart, checkout, order status, and the owner dashboard. Orders are saved in a free **Turso** database that you add from inside Vercel. You don't need a terminal for any of this.

You need three free accounts: **GitHub** (stores the code), **Vercel** (runs the site) and **Turso** (stores orders and menu). Turso is created for you from inside Vercel.

## 1. Put the code on GitHub

1. Go to github.com and sign in, or create an account.
2. Click **+** (top right) → **New repository**. Name it `viapasta`, choose **Private**, and click **Create repository**.
3. On the new page, click the link **uploading an existing file**.
4. Open the `viapasta-vercel` folder on your computer. Select **everything in it except the `docs` and `tests` folders**, and drag it onto the GitHub page. GitHub accepts at most 100 files at once.
5. Wait until all files are listed, then click **Commit changes**.
6. Click **Add file → Upload files** again. Drag in the `docs` and `tests` folders, then click **Commit changes**.

Check: the repository's main page should show `api`, `public`, `server`, `shared`, `vercel.json` and `package.json`.

## 2. Create the project on Vercel

1. Go to vercel.com → **Sign up / Log in** → **Continue with GitHub**.
2. Click **Add New… → Project**. Find `viapasta` in the list and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and allow the repository.
3. Leave every setting as it is and click **Deploy**.
4. When it finishes, open the site. You'll see **"Via Pasta — one more setup step"**. That's expected, because there's no database yet.

## 3. Add the database (Turso)

1. In your Vercel project, open the **Storage** tab → **Create Database**. Choose **Turso** (it may be listed as *Turso Cloud* under Marketplace) and click **Continue**.
2. Accept the terms. Pick the free plan and, if asked, a region in **Europe (Frankfurt)**, because the site runs there.
3. When it asks which project to connect, choose **viapasta** with **all environments** ticked, then click **Connect**.

This adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the project for you. You don't need to copy them anywhere.

## 4. Create your owner login

1. In the project, open **Settings → Environment Variables**.
2. Add these two variables, with **All Environments** selected:
   - `OWNER_EMAIL`: your email address
   - `OWNER_PASSWORD`: a password of **at least 12 characters**
3. Click **Save**.

The owner account is created the first time the site starts with these values. After that, changing them does nothing; change your password in the dashboard under **Staff** instead. Once you can sign in, you can delete `OWNER_PASSWORD` from Vercel.

## 5. Redeploy and open it

1. Open the **Deployments** tab → the top deployment → **⋯** → **Redeploy** → **Redeploy**.
2. Open `https://<your-project>.vercel.app`. The customer site loads in Arabic, and `/en` is English.
3. Open `https://<your-project>.vercel.app/admin` and sign in with your email and password.

The first page load after a deploy takes a few seconds, while the database tables and the verified menu are created.

## Good to know

- **Payments:** customers pay at pickup. Online card payments stay off until you have a Moyasar merchant account (see `DEPLOY.md` §4).
- **Search engines:** the site tells Google not to index it until you're ready. When you want it found, add the variable `ALLOW_INDEXING` = `1` and redeploy.
- **Your own domain:** go to Vercel → **Settings → Domains**. After adding it, set `PUBLIC_URL` = `https://your-domain` and redeploy so QR codes and links use it.
- **Live orders:** the dashboard checks for new orders every few seconds. Keep it open on the counter tablet with sound turned on.
- **Photos you upload** in the menu editor are stored in the database, so they survive redeploys.
- **Updating the site later:** upload the changed files to the same GitHub repository. Vercel redeploys automatically.
- **If you see the setup page again**, it lists exactly what is missing. Fix it in Vercel and redeploy.

## Running it on your own computer instead

You can still double-click **Start Via Pasta (Windows)**, which needs Node.js 22.13 or newer. Locally it uses a database file in the `data` folder instead of Turso.
