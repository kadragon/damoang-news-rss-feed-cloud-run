// src/gcsClient.js
import { Storage } from "@google-cloud/storage";
import { getItems } from "./crawler.js";
import { buildFeedXml } from "./rssBuilder.js";

// 파일명 및 기본 TTL 설정 (1시간: 3600000ms)
const FILE_NAME = "feed.xml";
const DEFAULT_TTL_MS = process.env.CACHE_TTL_MS
  ? parseInt(process.env.CACHE_TTL_MS, 10)
  : 3600 * 1000;

const storage = new Storage();
const bucket = storage.bucket(process.env.CACHE_BUCKET);

// XML 문자열을 저장
async function saveXml(xml) {
  if (typeof xml !== "string") {
    throw new TypeError("saveXml: xml must be a string");
  }
  const file = bucket.file(FILE_NAME);
  await file.save(xml, {
    contentType: "application/rss+xml",
    resumable: false,
  });
}

// 저장된 XML 가져오기
export async function getXml() {
  if (await isStale()) {
    console.log("캐시 만료: RSS 재생성");
    await generateAndCache();
  }

  const file = bucket.file(FILE_NAME);
  const [buffer] = await file.download();

  return buffer.toString("utf-8");
}

/**
 * 캐시 유효성 검사
 * @param {number} [ttlMs=DEFAULT_TTL_MS] - TTL in milliseconds
 * @returns {Promise<boolean>} - TTL을 초과했으면 true
 */
export async function isStale(ttlMs = DEFAULT_TTL_MS) {
  try {
    const file = bucket.file(FILE_NAME);
    const [meta] = await file.getMetadata();
    const updated = new Date(meta.updated).getTime();
    return Date.now() - updated > ttlMs;
  } catch (err) {
    // 파일이 없거나 메타데이터 조회 오류 시 stale로 간주
    console.error("isStale: metadata fetch error, marking stale", err);
    return true;
  }
}

// RSS 생성 후 GCS 캐시 저장
async function generateAndCache() {
  const items = await getItems();
  const xml = buildFeedXml(items);
  await saveXml(xml);
  return xml;
}
