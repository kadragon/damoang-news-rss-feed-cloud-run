import express from "express";
import compression from "compression";

import { getXml } from "./gcsClient.js";

const app = express();
const PORT = process.env.PORT || 8080;

// 모든 응답에 대해 GZIP 압축 적용
app.use(compression());

// RSS
app.get("/rss", async (_, res) => {
  try {
    // 캐시된 XML을 GCS에서 읽어 서빙
    const xml = await getXml();
    res.set("Content-Type", "application/rss+xml; charset=UTF-8").send(xml);
  } catch (e) {
    console.error("RSS 제공 중 오류:", e);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
