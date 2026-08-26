import type { Express } from "express";
import { getAchievementAssetKey } from "../achievementAssetProxy";
import { storageGetSignedUrl, storageRead } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/assets/achievement/:id.png", async (req, res) => {
    const key = getAchievementAssetKey(req.params.id);
    if (!key) {
      res.status(404).send("Unknown achievement asset");
      return;
    }

    try {
      const asset = await storageRead(key);
      res.set({
        "Content-Type": asset.contentType === "image/png" ? "image/png" : "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      });
      res.status(200).send(asset.data);
    } catch (err) {
      console.error("[AchievementAssetProxy] failed:", err);
      res.status(502).send("Achievement asset unavailable");
    }
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
