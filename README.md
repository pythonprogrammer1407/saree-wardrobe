# Saree Wardrobe

A personal, mobile-first catalogue of my saree collection: browse by colour, track where each saree is stored and when it was last worn, and search by photo.

- **App:** React + Vite + Tailwind, hosted on GitHub Pages
- **Data + login:** Supabase (Postgres, row-level security: only the logged-in owner sees anything)
- **Photos:** Cloudinary (only the image `public_id` is stored in the database)
- **UI design:** https://claude.ai/artifact/WYAyeMBNVuc9dVYcmRLeX6

## Run locally

```bash
nvm use                       # Node 22 (see .nvmrc)
npm install
cp .env.example .env.local    # then fill in the keys
npm run dev
```

## Account setup (one time)

1. **GitHub:** create a repo `saree-wardrobe` (public is fine: no data or keys live in the code). Settings → Pages → Source: **GitHub Actions**.
2. **Supabase:** new project → SQL Editor → run `supabase/schema.sql`. Authentication → Users → add yourself. Turn **off** "Allow new users to sign up". Copy the Project URL and anon/publishable key.
3. **Cloudinary:** note the cloud name. Settings → Upload → add an **unsigned** upload preset `saree_uploads` (folder `sarees`, allowed formats jpg/png/webp/heic, max file size 5 MB).
4. Put the four values in `.env.local`, and also as **GitHub repo secrets** (Settings → Secrets and variables → Actions) with the same names.

Pushing to `main` deploys to `https://<github-user>.github.io/saree-wardrobe/`.
